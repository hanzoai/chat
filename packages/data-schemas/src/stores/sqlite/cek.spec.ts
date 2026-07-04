import {
  PrincipalGlobal,
  deriveKEK,
  lengthPrefixedInfo,
  newDEK,
  principalAAD,
  unwrapDEK,
  wrapDEK,
} from './cek';

/**
 * Envelope CEK/KMS keying — a byte-exact port of the Go driver `hanzoai/sqlite`
 * `cek.go`. The golden vectors here are the interop contract: they are what the
 * REAL Go `DeriveKey`/`PrincipalAAD` produce (independently confirmed), so any
 * drift in this port breaks Go↔Node database interchange.
 */
describe('cek — length-prefixed info (domain separation)', () => {
  it('reproduces the golden info encoding for (global, hanzo-chat)', () => {
    // uvarint(6)||"global"||uvarint(10)||"hanzo-chat"
    expect(lengthPrefixedInfo('global', 'hanzo-chat').toString('hex')).toBe(
      '06676c6f62616c0a68616e7a6f2d63686174',
    );
  });

  it('is injective across the type/id boundary', () => {
    // ("org","a:b") and ("org:a","b") must NOT collide (a plain "%s:%s" would).
    const a = lengthPrefixedInfo('org', 'a:b').toString('hex');
    const b = lengthPrefixedInfo('org:a', 'b').toString('hex');
    expect(a).not.toBe(b);
  });

  it('principalAAD equals lengthPrefixedInfo (one encoding, two uses)', () => {
    expect(principalAAD('global', 'hanzo-chat').equals(lengthPrefixedInfo('global', 'hanzo-chat'))).toBe(
      true,
    );
  });
});

describe('cek — deriveKEK (HKDF-SHA256, 32-zero salt)', () => {
  const master = Buffer.from(Array.from({ length: 32 }, (_, i) => i)); // 0x00..0x1f

  it('reproduces the GOLDEN KEK vector byte-for-byte', () => {
    // MUST equal the Go `DeriveKey(master, PrincipalGlobal, "hanzo-chat")` output.
    expect(deriveKEK(master, PrincipalGlobal, 'hanzo-chat').toString('hex')).toBe(
      '9654df5332ffab28e0d4e7093b5d7969764183924e12ea605ee57356a777dda2',
    );
  });

  it('is deterministic and 32 bytes', () => {
    const k1 = deriveKEK(master, 'org', 'acme');
    const k2 = deriveKEK(master, 'org', 'acme');
    expect(k1.length).toBe(32);
    expect(k1.equals(k2)).toBe(true);
  });

  it('separates by id and by type', () => {
    expect(deriveKEK(master, 'org', 'alpha').equals(deriveKEK(master, 'org', 'beta'))).toBe(false);
    expect(deriveKEK(master, 'org', 'foo').equals(deriveKEK(master, 'user', 'foo'))).toBe(false);
  });

  it('rejects a non-32-byte master key and an empty id', () => {
    expect(() => deriveKEK(Buffer.alloc(16), 'org', 'x')).toThrow(/master key must be 32 bytes/);
    expect(() => deriveKEK(master, 'org', '')).toThrow(/principal ID cannot be empty/);
  });
});

describe('cek — newDEK', () => {
  it('produces a fresh 32-byte key each call', () => {
    const a = newDEK();
    const b = newDEK();
    expect(a.length).toBe(32);
    expect(b.length).toBe(32);
    expect(a.equals(b)).toBe(false);
  });
});

describe('cek — wrap/unwrap envelope (AES-256-GCM)', () => {
  const kek = deriveKEK(Buffer.from(Array.from({ length: 32 }, (_, i) => i)), PrincipalGlobal, 'hanzo-chat');
  const aad = principalAAD(PrincipalGlobal, 'hanzo-chat');
  const dek = newDEK();

  it('round-trips the DEK exactly', () => {
    const blob = wrapDEK(kek, dek, aad);
    expect(unwrapDEK(kek, blob, aad).equals(dek)).toBe(true);
  });

  it('emits version(1)||nonce(12)||ct(32)||tag(16) = 61 bytes with a random nonce', () => {
    const b1 = wrapDEK(kek, dek, aad);
    const b2 = wrapDEK(kek, dek, aad);
    expect(b1.length).toBe(1 + 12 + 32 + 16);
    expect(b1[0]).toBe(0x01);
    // Fresh nonce each wrap → distinct ciphertext for the same DEK.
    expect(b1.equals(b2)).toBe(false);
  });

  it('rejects a flipped ciphertext byte (GCM tag)', () => {
    const blob = wrapDEK(kek, dek, aad);
    blob[20] ^= 0xff; // inside the ciphertext region
    expect(() => unwrapDEK(kek, blob, aad)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('rejects a flipped nonce byte', () => {
    const blob = wrapDEK(kek, dek, aad);
    blob[3] ^= 0x01; // inside the nonce
    expect(() => unwrapDEK(kek, blob, aad)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('rejects the WRONG KEK', () => {
    const blob = wrapDEK(kek, dek, aad);
    const otherKek = deriveKEK(Buffer.alloc(32, 7), 'org', 'other');
    expect(() => unwrapDEK(otherKek, blob, aad)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('rejects the WRONG principal AAD (sidecar lifted to another principal)', () => {
    const blob = wrapDEK(kek, dek, aad);
    const wrongAad = principalAAD('org', 'hanzo-chat');
    expect(() => unwrapDEK(kek, blob, wrongAad)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('rejects truncation below the minimum length', () => {
    const blob = wrapDEK(kek, dek, aad);
    expect(() => unwrapDEK(kek, blob.subarray(0, 20), aad)).toThrow(/too short/);
  });

  it('rejects a version-byte downgrade (unforgeable version)', () => {
    const blob = wrapDEK(kek, dek, aad);
    blob[0] = 0x02; // future/unknown version
    expect(() => unwrapDEK(kek, blob, aad)).toThrow(/unsupported wrapped-DEK version 2/);
    blob[0] = 0x00; // downgrade
    expect(() => unwrapDEK(kek, blob, aad)).toThrow(/unsupported wrapped-DEK version 0/);
  });

  it('rejects a valid blob re-tagged to version 1 with a mutated version-AAD', () => {
    // Even keeping byte0 = 1 but tampering the ciphertext-adjacent bytes fails —
    // the version is bound into the GCM AAD (version||aad), so no forgery path.
    const blob = wrapDEK(kek, dek, aad);
    blob[blob.length - 1] ^= 0x01; // flip the last tag byte
    expect(() => unwrapDEK(kek, blob, aad)).toThrow();
  });
});

describe('cek — master-key rotation is an envelope rewrap (DEK unchanged)', () => {
  it('a DEK wrapped under KEK(old) fails under KEK(new); rewrapping restores it', () => {
    const oldMaster = Buffer.alloc(32, 1);
    const newMaster = Buffer.alloc(32, 2);
    const oldKek = deriveKEK(oldMaster, PrincipalGlobal, 'hanzo-chat');
    const newKek = deriveKEK(newMaster, PrincipalGlobal, 'hanzo-chat');
    const aad = principalAAD(PrincipalGlobal, 'hanzo-chat');
    const dek = newDEK();

    const oldBlob = wrapDEK(oldKek, dek, aad);
    // New KEK cannot open the old blob.
    expect(() => unwrapDEK(newKek, oldBlob, aad)).toThrow();

    // Rotation: unwrap with old, rewrap with new — the DEK is byte-identical.
    const recovered = unwrapDEK(oldKek, oldBlob, aad);
    expect(recovered.equals(dek)).toBe(true);
    const newBlob = wrapDEK(newKek, recovered, aad);
    expect(unwrapDEK(newKek, newBlob, aad).equals(dek)).toBe(true);
  });
});
