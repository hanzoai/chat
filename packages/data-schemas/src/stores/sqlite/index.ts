/**
 * SQLite document store — the embedded default backend for the chat data layer.
 *
 * `createSqliteHandle(names)` returns a mongoose-shaped handle whose
 * `.models.<Name>` are SQLite-backed `DocModel`s satisfying the Model API the
 * data methods use. The unchanged `createConversationMethods(handle, ...)` /
 * `createMessageMethods(handle)` run against it verbatim — this is the seam.
 *
 * Backend selection is orthogonal: the same method code runs on the mongoose
 * handle or this SQLite handle. A networked Hanzo Base / cloud `/v1` backend is
 * a future third implementation of the same handle shape.
 */
import type Database from 'better-sqlite3-multiple-ciphers';
import { DocModel, type CollectionSpec } from './DocModel';
import { CHAT_COLLECTION_SPECS } from './collections';
import { ObjectId } from './engine';
import { keySqlcipher, loadOrCreateDEK, masterKeyFromEnv } from './keying';

export { DocModel, type CollectionSpec } from './DocModel';
export { CHAT_COLLECTION_SPECS } from './collections';
export { ObjectId } from './engine';
export { createDualWriteModel, DualWriteModel } from './DualWriteModel';
export {
  CHAT_PRINCIPAL,
  MASTER_KEY_ENV,
  loadOrCreateDEK,
  masterKeyFromEnv,
  rewrapSidecar,
  sidecarPath,
} from './keying';

export interface SqliteHandle {
  models: Record<string, DocModel>;
  db: Database.Database;
  Types: { ObjectId: typeof ObjectId };
  close(): void;
}

/**
 * Opens a SQLite database. Defaults to the path in `CHAT_SQLITE_PATH`, else an
 * in-memory database (used by tests). WAL + NORMAL sync for durable throughput.
 *
 * Encryption at rest (SQLCipher AES-256, byte-compatible with the canonical Go
 * driver `hanzoai/sqlite`) is driven by the rotation-safe ENVELOPE model — one
 * canonical production path, no raw-key env seam:
 *   - `CHAT_SQLITE_MASTER_KEY` (64-hex = 32 bytes, sourced from KMS) is the KMS
 *     master key. Unset → the file is opened UNENCRYPTED (tests + local dev).
 *   - A per-file random DEK (the SQLCipher page key) lives WRAPPED under a KEK
 *     derived from the master key in a sidecar at `${dbPath}.dek`. On open the
 *     sidecar is unwrapped (or minted+written on first open); the raw DEK keys
 *     SQLCipher and is never persisted or logged. Rotating the master key rewraps
 *     the sidecar (DEK unchanged → pages untouched); see `rewrapSidecar`.
 */
export function openDatabase(dbPath?: string): Database.Database {
  // `better-sqlite3-multiple-ciphers` is a native addon. The data-schemas index
  // is loaded at server boot even when the store is inert (unset
  // CHAT_STORE_SQLITE), so require it lazily — only when a database is actually
  // opened — keeping module import side-effect-free.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DatabaseCtor = require('better-sqlite3-multiple-ciphers') as typeof import('better-sqlite3-multiple-ciphers');
  const path = dbPath ?? process.env.CHAT_SQLITE_PATH ?? ':memory:';
  const db = new DatabaseCtor(path);
  if (path !== ':memory:') {
    // SQLCipher keying MUST precede any statement that touches DB pages. An
    // in-memory database has no file at rest and no sidecar, so it is never keyed.
    const masterKey = masterKeyFromEnv();
    if (masterKey) {
      keySqlcipher(db, loadOrCreateDEK(path, masterKey));
    }
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
    // The one-shot Mongo→SQLite backfill runs as a SEPARATE process against this
    // same file; WAL permits one writer at a time, so wait for the lock rather
    // than erroring when the live pod and the backfill overlap.
    db.exec('PRAGMA busy_timeout = 5000');
  }
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * Builds a mongoose-shaped handle backed by SQLite for the given collection
 * names (defaults to all known chat collection specs). Pass a shared
 * `Database` to co-locate collections in one file.
 */
export function createSqliteHandle(
  names?: string[],
  options: { db?: Database.Database; dbPath?: string; specs?: Record<string, CollectionSpec> } = {},
): SqliteHandle {
  const specs = options.specs ?? CHAT_COLLECTION_SPECS;
  const db = options.db ?? openDatabase(options.dbPath);
  const selected = names ?? Object.keys(specs);
  const models: Record<string, DocModel> = {};
  for (const name of selected) {
    const spec = specs[name];
    if (!spec) {
      throw new Error(`[sqlite-store] no CollectionSpec for '${name}'`);
    }
    models[name] = new DocModel(db, spec);
  }
  // Wire cross-collection resolution for `.populate()`.
  for (const model of Object.values(models)) {
    model.resolver = (name: string) => models[name];
  }
  return {
    models,
    db,
    Types: { ObjectId },
    close: () => db.close(),
  };
}
