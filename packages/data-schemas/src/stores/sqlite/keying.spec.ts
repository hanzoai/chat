import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3-multiple-ciphers';
import { masterKeyFromEnv, MASTER_KEY_ENV, openDatabase, rewrapSidecar, sidecarPath } from './index';

/**
 * Encryption-at-rest + envelope keying, exercised against the REAL native
 * `better-sqlite3-multiple-ciphers` driver and the production `openDatabase`
 * path. Native-driver spec → runs one-file-per-process (see test/ci.mjs).
 *
 * Byte-compatibility with the Go driver `hanzoai/sqlite` (real libsqlcipher) is
 * proven out-of-band by the Go↔Node cross-open harness; here we prove the JS side
 * is fail-secure end-to-end: real ciphertext on disk, wrong master rejected, and
 * O(1) master-key rotation that leaves the encrypted pages untouched.
 */
const MASTER_A = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const MASTER_B = 'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100';
const CANARY = 'PLAINTEXT_CANARY_c0ffee_hanzo_chat';

let dir: string;
const savedEnv = process.env[MASTER_KEY_ENV];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'chat-cek-'));
});
afterEach(() => {
  if (savedEnv === undefined) {
    delete process.env[MASTER_KEY_ENV];
  } else {
    process.env[MASTER_KEY_ENV] = savedEnv;
  }
  rmSync(dir, { recursive: true, force: true });
});

/** Opens via the production path under a given master key (or unencrypted). */
function open(dbPath: string, masterHex?: string): Database.Database {
  if (masterHex === undefined) {
    delete process.env[MASTER_KEY_ENV];
  } else {
    process.env[MASTER_KEY_ENV] = masterHex;
  }
  return openDatabase(dbPath);
}

function writeCanary(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)');
  db.prepare('INSERT INTO t (id, v) VALUES (1, ?)').run(CANARY);
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); // flush WAL into the main file
}
function readCanary(db: Database.Database): string | undefined {
  return (db.prepare('SELECT v FROM t WHERE id = 1').get() as { v: string } | undefined)?.v;
}

describe('masterKeyFromEnv', () => {
  it('returns null when unset (unencrypted dev/test path)', () => {
    delete process.env[MASTER_KEY_ENV];
    expect(masterKeyFromEnv()).toBeNull();
  });
  it('throws on a malformed key — never a silent plaintext fallback', () => {
    process.env[MASTER_KEY_ENV] = 'not-hex';
    expect(() => masterKeyFromEnv()).toThrow(/64-hex/);
    process.env[MASTER_KEY_ENV] = 'abc'; // too short
    expect(() => masterKeyFromEnv()).toThrow(/64-hex/);
  });
  it('returns a 32-byte buffer for a valid 64-hex key', () => {
    process.env[MASTER_KEY_ENV] = MASTER_A;
    expect(masterKeyFromEnv()?.length).toBe(32);
  });
});

describe('openDatabase — encryption at rest (envelope)', () => {
  it('writes real ciphertext, mints a 0600 sidecar, and reopens', () => {
    const dbPath = join(dir, 'chat.db');
    let db = open(dbPath, MASTER_A);
    writeCanary(db);
    db.close();

    // (a) sidecar: exists, exactly version(1)+nonce(12)+ct(32)+tag(16)=61 bytes,
    //     and NOT readable by group/other.
    const side = sidecarPath(dbPath);
    expect(existsSync(side)).toBe(true);
    expect(statSync(side).size).toBe(61);
    expect(statSync(side).mode & 0o077).toBe(0); // no group/other access (0600)

    // (b) at rest: the plaintext canary is absent and the header is a random
    //     SQLCipher salt, NOT the "SQLite format 3\0" magic.
    const raw = readFileSync(dbPath);
    expect(raw.includes(Buffer.from(CANARY))).toBe(false);
    expect(raw.subarray(0, 16).toString('latin1')).not.toContain('SQLite format 3');

    // (c) reopen with the SAME master → row is readable (DEK recovered from sidecar).
    db = open(dbPath, MASTER_A);
    expect(readCanary(db)).toBe(CANARY);
    db.close();
  });

  it('rejects the WRONG master at the envelope (fail-secure, no partial key)', () => {
    const dbPath = join(dir, 'chat.db');
    const db = open(dbPath, MASTER_A);
    writeCanary(db);
    db.close();

    // Wrong master → sidecar unwrap fails the GCM tag → throws before SQLCipher.
    expect(() => open(dbPath, MASTER_B)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('unset master opens UNENCRYPTED (no sidecar, plaintext on disk)', () => {
    const dbPath = join(dir, 'plain.db');
    const db = open(dbPath, undefined);
    writeCanary(db);
    db.close();

    expect(existsSync(sidecarPath(dbPath))).toBe(false);
    const raw = readFileSync(dbPath);
    expect(raw.subarray(0, 16).toString('latin1')).toContain('SQLite format 3');
    expect(raw.includes(Buffer.from(CANARY))).toBe(true); // plaintext, as documented
  });
});

describe('rewrapSidecar — O(1) master-key rotation (pages untouched)', () => {
  it('rotates old→new: new master reads, old master no longer opens, data intact', () => {
    const dbPath = join(dir, 'chat.db');
    let db = open(dbPath, MASTER_A);
    writeCanary(db);
    db.close();

    const before = readFileSync(dbPath); // ciphertext pages snapshot

    rewrapSidecar(dbPath, Buffer.from(MASTER_A, 'hex'), Buffer.from(MASTER_B, 'hex'));

    // The encrypted PAGES are byte-identical — only the sidecar changed (DEK same).
    expect(readFileSync(dbPath).equals(before)).toBe(true);

    // New master opens and reads the pre-rotation data.
    db = open(dbPath, MASTER_B);
    expect(readCanary(db)).toBe(CANARY);
    db.close();

    // Old master is now rejected.
    expect(() => open(dbPath, MASTER_A)).toThrow(/wrong key, wrong principal, or corrupt blob/);
  });

  it('a wrong old-master rewrap throws and leaves the sidecar intact', () => {
    const dbPath = join(dir, 'chat.db');
    const db = open(dbPath, MASTER_A);
    writeCanary(db);
    db.close();

    const sidecarBefore = readFileSync(sidecarPath(dbPath));
    expect(() =>
      rewrapSidecar(dbPath, Buffer.from(MASTER_B, 'hex'), Buffer.from(MASTER_A, 'hex')),
    ).toThrow(/wrong key, wrong principal, or corrupt blob/);
    // Sidecar untouched → the real master still opens the DB.
    expect(readFileSync(sidecarPath(dbPath)).equals(sidecarBefore)).toBe(true);
    const db2 = open(dbPath, MASTER_A);
    expect(readCanary(db2)).toBe(CANARY);
    db2.close();
  });
});
