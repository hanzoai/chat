/**
 * Envelope keying lifecycle for the SQLite store — the seam between the pure
 * crypto in `cek.ts` and the on-disk SQLCipher database.
 *
 * Chat is ONE shared database file with row-level tenant isolation (not per-org
 * files), so it keys under a single fixed principal: PrincipalGlobal / "hanzo-chat".
 * The DEK for that file lives wrapped in a sidecar at `${dbPath}.dek`; the raw DEK
 * is never written to disk and never logged.
 *
 * SQLCipher parameter contract (load-bearing — cross-open with `hanzoai/sqlite`):
 * `hanzoai/sqlite` links the REAL libsqlcipher, which implements exactly one
 * cipher (SQLCipher) at its v4 defaults (PBKDF2-HMAC-SHA512 ×256000, HMAC-SHA512,
 * 4096-byte pages, 16-byte salt in the file header, no plaintext header) and takes
 * a raw key via `key=x'HEX'` — no `cipher=` pragma, because there is only one
 * cipher. `better-sqlite3-multiple-ciphers` (SQLite3MultipleCiphers) supports MANY
 * ciphers, so it must be told to emulate that exact format:
 *   PRAGMA cipher='sqlcipher';  -- select the SQLCipher scheme
 *   PRAGMA legacy=4;            -- emulate SQLCipher *version 4* on-disk format
 *   PRAGMA key="x'HEX'";        -- 32-byte raw key => skip the passphrase KDF
 * `legacy=4` here means "byte-compatible with SQLCipher v4" (SQLite3MC's term for
 * on-disk-format-version, NOT "deprecated"); `legacy=0` would be SQLite3MC's own
 * non-SQLCipher variant, which real libsqlcipher cannot read. Proven byte-compat
 * by the Go↔Node cross-open test.
 */
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrincipalGlobal, deriveKEK, newDEK, principalAAD, unwrapDEK, wrapDEK } from './cek';

/** The single principal chat's shared database keys under. */
export const CHAT_PRINCIPAL = { type: PrincipalGlobal, id: 'hanzo-chat' } as const;

/** Env var holding the 32-byte (64-hex) KMS master key. Unset => unencrypted. */
export const MASTER_KEY_ENV = 'CHAT_SQLITE_MASTER_KEY';

/** Minimal structural view of the native handle — just the `pragma` sink. */
interface Keyable {
  pragma(source: string): unknown;
}

/**
 * Reads and validates the master key from `CHAT_SQLITE_MASTER_KEY`. Returns null
 * when unset (tests / local dev open unencrypted). A malformed value is a hard
 * error — never a silent fallback to plaintext.
 */
export function masterKeyFromEnv(): Buffer | null {
  const hex = process.env[MASTER_KEY_ENV];
  if (!hex) {
    return null;
  }
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(`[sqlite-store] ${MASTER_KEY_ENV} must be a 64-hex-char (32-byte) master key`);
  }
  return Buffer.from(hex, 'hex');
}

/** Sidecar path for a database file: the wrapped-DEK blob lives beside it. */
export function sidecarPath(dbPath: string): string {
  return `${dbPath}.dek`;
}

/** The chat principal's GCM binding context (= HKDF info; one encoding, DRY). */
function chatAAD(): Buffer {
  return principalAAD(CHAT_PRINCIPAL.type, CHAT_PRINCIPAL.id);
}

/**
 * Writes the sidecar atomically: a private tmp file (mode 0600) is fsync'd then
 * renamed over the target, so a crash mid-write can never leave a truncated or
 * partially-visible sidecar (a corrupt sidecar would brick the database). `wx`
 * fails if the tmp name already exists (no clobber of a concurrent writer's tmp).
 */
function writeSidecarAtomic(path: string, blob: Buffer): void {
  const tmp = `${path}.tmp.${process.pid}.${randomBytes(6).toString('hex')}`;
  const fd = openSync(tmp, 'wx', 0o600);
  try {
    writeSync(fd, blob);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
}

/**
 * Resolves the raw SQLCipher DEK for a database file under `masterKey`:
 *   - sidecar exists  → unwrap it under the KEK (THROWS on tamper / wrong master)
 *   - sidecar absent  → mint a fresh DEK, wrap it under the KEK, write the sidecar
 * The returned DEK is the page key; never log it.
 */
export function loadOrCreateDEK(dbPath: string, masterKey: Buffer): Buffer {
  const kek = deriveKEK(masterKey, CHAT_PRINCIPAL.type, CHAT_PRINCIPAL.id);
  const aad = chatAAD();
  const path = sidecarPath(dbPath);
  if (existsSync(path)) {
    return unwrapDEK(kek, readFileSync(path), aad);
  }
  const dek = newDEK();
  writeSidecarAtomic(path, wrapDEK(kek, dek, aad));
  return dek;
}

/**
 * Rotates the master key WITHOUT touching the encrypted pages: unwrap the DEK
 * under the OLD master's KEK, rewrap under the NEW master's KEK, atomically
 * replace the sidecar. The DEK — and therefore every ciphertext page — is
 * unchanged, so this is O(1) and cannot brick the file. A wrong `oldMaster` (or a
 * tampered sidecar) THROWS from the unwrap and leaves the sidecar intact.
 */
export function rewrapSidecar(dbPath: string, oldMaster: Buffer, newMaster: Buffer): void {
  const aad = chatAAD();
  const oldKEK = deriveKEK(oldMaster, CHAT_PRINCIPAL.type, CHAT_PRINCIPAL.id);
  const dek = unwrapDEK(oldKEK, readFileSync(sidecarPath(dbPath)), aad);
  const newKEK = deriveKEK(newMaster, CHAT_PRINCIPAL.type, CHAT_PRINCIPAL.id);
  writeSidecarAtomic(sidecarPath(dbPath), wrapDEK(newKEK, dek, aad));
}

/**
 * Keys a `better-sqlite3-multiple-ciphers` handle with the raw DEK in
 * SQLCipher-4-compatible RAW-key format (see file header). MUST run before any
 * page-touching statement. Never log the DEK or the pragma text.
 */
export function keySqlcipher(db: Keyable, dek: Buffer): void {
  db.pragma("cipher='sqlcipher'");
  db.pragma('legacy=4');
  db.pragma(`key="x'${dek.toString('hex')}'"`);
}
