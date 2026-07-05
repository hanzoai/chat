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
import { DocModel, type CollectionSpec, type SqliteDatabase } from './DocModel';
import { CHAT_COLLECTION_SPECS } from './collections';
import { ObjectId } from './engine';

export { DocModel, type CollectionSpec } from './DocModel';
export { CHAT_COLLECTION_SPECS } from './collections';
export { ObjectId } from './engine';
export { createDualWriteModel, DualWriteModel } from './DualWriteModel';

export interface SqliteHandle {
  models: Record<string, DocModel>;
  db: SqliteDatabase;
  Types: { ObjectId: typeof ObjectId };
  close(): void;
}

/**
 * Opens a SQLite database. Defaults to the path in `CHAT_SQLITE_PATH`, else an
 * in-memory database (used by tests). WAL + NORMAL sync for durable throughput.
 * A non-memory file is opened encrypted (SQLCipher AES-256, `hanzoai/sqlite`
 * contract) when `CHAT_SQLITE_KEY` holds a 64-hex-char raw key; unset opens
 * unencrypted (tests + local dev).
 */
export function openDatabase(dbPath?: string): SqliteDatabase {
  // `better-sqlite3-multiple-ciphers` is a native addon. The data-schemas index
  // is loaded at server boot even when the store is inert (unset
  // CHAT_STORE_SQLITE), so require it lazily — only when a database is actually
  // opened — keeping module import side-effect-free. Typed as the minimal
  // `SqliteDatabase` ctor (not the driver's heavy types — see DocModel.ts).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DatabaseCtor = require('better-sqlite3-multiple-ciphers') as new (
    path: string,
  ) => SqliteDatabase;
  const path = dbPath ?? process.env.CHAT_SQLITE_PATH ?? ':memory:';
  const db = new DatabaseCtor(path);
  if (path !== ':memory:') {
    // SQLCipher keying MUST precede any statement that touches DB pages. Never
    // log the key or the keyed path. KMS/CEK derivation is a later milestone;
    // this only honors a raw key supplied out-of-band.
    const key = process.env.CHAT_SQLITE_KEY;
    if (key) {
      if (!/^[0-9a-f]{64}$/i.test(key)) {
        throw new Error('[sqlite-store] CHAT_SQLITE_KEY must be a 64-hex-char raw key');
      }
      db.pragma("cipher='sqlcipher'");
      db.pragma('legacy=4');
      db.pragma(`key="x'${key}'"`);
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
  options: { db?: SqliteDatabase; dbPath?: string; specs?: Record<string, CollectionSpec> } = {},
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
