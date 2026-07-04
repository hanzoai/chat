/**
 * Per-principal key derivation and envelope wrapping — a byte-exact JS port of
 * the canonical Go driver `github.com/hanzoai/sqlite` `cek.go`. Every derived KEK,
 * wrapped-DEK blob and AAD produced here is interoperable with that Go
 * implementation (same HKDF, same length-prefixed info, same AES-256-GCM wrap
 * format) so a database keyed on either side is readable on the other.
 *
 * ENVELOPE MODEL (read before changing — this is what makes master-key rotation
 * non-destructive):
 *
 *   1. Each database gets its OWN random 256-bit Data Encryption Key (DEK),
 *      generated once at creation by `newDEK()`. SQLCipher encrypts the file
 *      pages with this DEK and only this DEK — it never changes for the life of
 *      the file, so the ciphertext pages are never rewritten.
 *   2. The DEK is wrapped (AES-256-GCM) under a Key Encryption Key (KEK) derived
 *      from the KMS master key:
 *        KEK = HKDF-SHA256(masterKey, salt = 32×0x00, info = lp(type) || lp(id))
 *      The wrapped DEK is stored beside the database (a small sidecar blob); the
 *      raw DEK is never written to disk.
 *   3. Opening: unwrap the stored DEK with the KEK, key SQLCipher with the DEK.
 *   4. Master-key ROTATION: unwrap the DEK with the OLD KEK, rewrap it with the
 *      NEW KEK, atomically replace the sidecar. The DEK is unchanged, so the
 *      encrypted pages are untouched — rotation is O(1) per database and cannot
 *      brick a file.
 *
 * `lp(x)` is the length-prefixed encoding of x (uvarint length || bytes). It is
 * injective, so two principals can never collide across the type/id boundary
 * (e.g. type "org"+id "a:b" and type "org:a"+id "b" encode differently — a plain
 * "%s:%s" form does not guarantee this).
 *
 * NEVER log a master key, a KEK, a DEK, or a sidecar blob.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Principal type — the domain-separation tag of the derived KEK. Matches the Go
 * `PrincipalType` constants byte-for-byte (the raw string is the HKDF info tag).
 */
export type PrincipalType = 'global' | 'org' | 'user';

/** Cross-org global/platform database (distinct from any org named "global"). */
export const PrincipalGlobal: PrincipalType = 'global';
export const PrincipalOrg: PrincipalType = 'org';
export const PrincipalUser: PrincipalType = 'user';

/** Length of a Data / Key Encryption Key (SQLCipher AES-256). */
const KEY_LEN = 32;
/** AES-256-GCM nonce length (`crypto/cipher` GCM standard nonce size). */
const NONCE_LEN = 12;
/** AES-256-GCM tag length (`gcm.Overhead()`). */
const TAG_LEN = 16;
/** On-disk wrapped-DEK format version. Byte 0 of a wrapped blob. */
const WRAP_VERSION = 0x01;

/**
 * HKDF salt. Go's `hkdf.New(sha256.New, master, nil, info)` treats a nil salt as
 * HashLen (32) zero bytes per RFC 5869 §2.2. Node's `hkdfSync` is given the same
 * 32 explicit zero bytes so the derivation is byte-identical and version-stable
 * (an EMPTY salt is NOT guaranteed to equal HashLen zeros across Node releases).
 */
const HKDF_ZERO_SALT = Buffer.alloc(32, 0);

/**
 * LEB128 unsigned-varint encoding of a non-negative length, matching Go's
 * `binary.PutUvarint`. Lengths < 128 encode as a single byte. Arithmetic (not
 * bitwise) so it stays correct for any safe integer, never truncating at 32 bits.
 */
function putUvarint(n: number): Buffer {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`sqlite/cek: uvarint length out of range: ${n}`);
  }
  const out: number[] = [];
  let v = n;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
  return Buffer.from(out);
}

/**
 * Injective HKDF `info` / GCM AAD for a principal:
 *
 *   uvarint(len(type)) || type || uvarint(len(id)) || id
 *
 * Injectivity guarantees domain separation across the type/id boundary. This is
 * the SAME encoding used for the KEK's HKDF info and for the wrap's GCM AAD — one
 * encoding, two uses (DRY, mirroring cek.go's `lengthPrefixedInfo`/`PrincipalAAD`).
 */
export function lengthPrefixedInfo(principalType: string, principalID: string): Buffer {
  const t = Buffer.from(principalType, 'utf8');
  const id = Buffer.from(principalID, 'utf8');
  return Buffer.concat([putUvarint(t.length), t, putUvarint(id.length), id]);
}

/**
 * Injective principal-binding context, suitable as the AES-256-GCM
 * additional-authenticated-data when wrapping that principal's DEK. Identical to
 * `lengthPrefixedInfo` — pass the same (type,id) to `wrapDEK`/`unwrapDEK` that you
 * derive the KEK with, or the GCM tag check fails.
 */
export function principalAAD(principalType: string, principalID: string): Buffer {
  return lengthPrefixedInfo(principalType, principalID);
}

/**
 * Derives a 256-bit KEK for a principal from a master key using HKDF-SHA256 with a
 * length-prefixed, injective `info`. In the envelope model this WRAPS a
 * per-database DEK; it is never a SQLCipher page key directly.
 */
export function deriveKEK(masterKey: Buffer, principalType: string, principalID: string): Buffer {
  if (masterKey.length !== 32) {
    throw new Error(`sqlite/cek: master key must be 32 bytes, got ${masterKey.length}`);
  }
  if (principalID === '') {
    throw new Error('sqlite/cek: principal ID cannot be empty');
  }
  const info = lengthPrefixedInfo(principalType, principalID);
  const okm = hkdfSync('sha256', masterKey, HKDF_ZERO_SALT, info, KEY_LEN);
  return Buffer.from(okm);
}

/**
 * Generates a fresh random 256-bit Data Encryption Key. Each database is created
 * with exactly one DEK, which never changes for the life of the file.
 */
export function newDEK(): Buffer {
  return randomBytes(KEY_LEN);
}

/**
 * GCM additional-authenticated-data: the wrap version byte (binds against a
 * downgrade) followed by the caller's principal-binding aad. Mirrors cek.go's
 * `wrapAAD`.
 */
function wrapAAD(aad: Buffer): Buffer {
  return Buffer.concat([Buffer.from([WRAP_VERSION]), aad]);
}

/**
 * Seals a DEK under a KEK with AES-256-GCM. Returns the storable blob:
 *
 *   version(1) || nonce(12) || ciphertext || tag(16)
 *
 * `aad` is the principal-binding context (`principalAAD(type,id)`) so the blob is
 * cryptographically bound to its principal — a sidecar moved to another principal
 * fails the tag even if a KEK ever collided (defense-in-depth atop the
 * per-principal KEK). The same `aad` MUST be supplied to `unwrapDEK`.
 */
export function wrapDEK(kek: Buffer, dek: Buffer, aad: Buffer): Buffer {
  if (kek.length !== 32) {
    throw new Error(`sqlite/cek: KEK must be 32 bytes, got ${kek.length}`);
  }
  if (dek.length !== KEY_LEN) {
    throw new Error(`sqlite/cek: DEK must be ${KEY_LEN} bytes, got ${dek.length}`);
  }
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv('aes-256-gcm', kek, nonce);
  cipher.setAAD(wrapAAD(aad));
  const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([WRAP_VERSION]), nonce, ciphertext, tag]);
}

/**
 * Opens a blob produced by `wrapDEK` under the same KEK and the same `aad`. A
 * wrong KEK, wrong aad (e.g. a sidecar from a different principal), truncated
 * blob, tampered ciphertext, or a version-byte change fails the GCM tag / version
 * check and THROWS — never a partial/garbage key.
 */
export function unwrapDEK(kek: Buffer, blob: Buffer, aad: Buffer): Buffer {
  if (kek.length !== 32) {
    throw new Error(`sqlite/cek: KEK must be 32 bytes, got ${kek.length}`);
  }
  // Minimum = version + nonce + tag (zero-length ciphertext), matching cek.go's
  // `1 + ns + gcm.Overhead()` guard.
  if (blob.length < 1 + NONCE_LEN + TAG_LEN) {
    throw new Error(`sqlite/cek: wrapped DEK too short (${blob.length} bytes)`);
  }
  if (blob[0] !== WRAP_VERSION) {
    throw new Error(`sqlite/cek: unsupported wrapped-DEK version ${blob[0]}`);
  }
  const nonce = blob.subarray(1, 1 + NONCE_LEN);
  const rest = blob.subarray(1 + NONCE_LEN);
  const ciphertext = rest.subarray(0, rest.length - TAG_LEN);
  const tag = rest.subarray(rest.length - TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', kek, nonce);
  decipher.setAAD(wrapAAD(aad));
  decipher.setAuthTag(tag);
  let dek: Buffer;
  try {
    dek = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // Uniform error — never distinguish wrong-key from wrong-principal from
    // corrupt-blob (that would be an oracle), and never surface a partial key.
    throw new Error('sqlite/cek: unwrap DEK (wrong key, wrong principal, or corrupt blob)');
  }
  if (dek.length !== KEY_LEN) {
    throw new Error(`sqlite/cek: unwrapped DEK has wrong length ${dek.length}`);
  }
  return dek;
}
