/**
 * Keyv store over the embedded SQLite database.
 *
 * This replaces `keyvMongo`. There is no MongoDB (see LLM.md, "The store"):
 * `MONGO_URI` is unset and every collection is served from `CHAT_SQLITE_PATH`,
 * so the Mongo-backed cache threw `Mongoose connection not ready` the first
 * time anything read it. Bans and encoded action domains are durable state, not
 * a memo — forgetting them un-bans a banned user and orphans every action tool
 * whose domain was encoded — so they need a store that outlives the process,
 * and the only such store here is the SQLite file on the PVC.
 *
 * Keyv owns serialization and expiry: it hands this store an opaque string with
 * `expires` already inside it and deletes on the read that finds it stale. The
 * store is therefore a two-column table and nothing more.
 *
 * The connection is `sharedDatabase()` — the same one the document store uses.
 */
import { EventEmitter } from 'events';
import { sharedDatabase, type SqliteDatabase } from '@hanzochat/data-schemas';

/** Set on the connection the table was created against, so a reopen recreates it. */
let prepared: SqliteDatabase | undefined;

function db(): SqliteDatabase {
  const database = sharedDatabase();
  if (prepared !== database) {
    database.exec('CREATE TABLE IF NOT EXISTS keyv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    prepared = database;
  }
  return database;
}

/** `?, ?, ?` for an IN clause of n keys. */
function placeholders(n: number): string {
  return new Array(n).fill('?').join(', ');
}

/** Escapes a LIKE pattern's literal prefix so a `%` or `_` in a namespace can't widen it. */
function likePrefix(value: string): string {
  return `${value.replace(/[\\%_]/g, '\\$&')}:%`;
}

export class KeyvSqlite extends EventEmitter {
  /** Keyv embeds `expires` in the value and expires on read; SQLite holds no TTL of its own. */
  public readonly ttlSupport = false;
  /** Keyv assigns this from the Keyv instance's namespace; `clear()` is scoped by it. */
  public namespace?: string;

  constructor(namespace?: string) {
    super();
    this.namespace = namespace;
  }

  async get(key: string): Promise<string | undefined> {
    const row = db().prepare('SELECT value FROM keyv WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  async getMany(keys: string[]): Promise<Array<string | undefined>> {
    if (keys.length === 0) {
      return [];
    }
    const rows = db()
      .prepare(`SELECT key, value FROM keyv WHERE key IN (${placeholders(keys.length)})`)
      .all(...keys) as Array<{ key: string; value: string }>;
    const found = new Map(rows.map((row) => [row.key, row.value]));
    return keys.map((key) => found.get(key));
  }

  async set(key: string, value: string): Promise<void> {
    db()
      .prepare(
        'INSERT INTO keyv (key, value) VALUES (?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value);
  }

  async delete(key: string): Promise<boolean> {
    const info = db().prepare('DELETE FROM keyv WHERE key = ?').run(key) as { changes: number };
    return info.changes > 0;
  }

  async deleteMany(keys: string[]): Promise<boolean> {
    if (keys.length === 0) {
      return false;
    }
    const info = db()
      .prepare(`DELETE FROM keyv WHERE key IN (${placeholders(keys.length)})`)
      .run(...keys) as { changes: number };
    return info.changes > 0;
  }

  async has(key: string): Promise<boolean> {
    return db().prepare('SELECT 1 FROM keyv WHERE key = ?').get(key) !== undefined;
  }

  async clear(): Promise<void> {
    // Keyv keys are `${namespace}:${key}`. A store with no namespace owns the table.
    if (this.namespace) {
      db().prepare("DELETE FROM keyv WHERE key LIKE ? ESCAPE '\\'").run(likePrefix(this.namespace));
      return;
    }
    db().exec('DELETE FROM keyv');
  }

  /** No-op: the connection is process-shared, so closing it here would take the store with it. */
  async disconnect(): Promise<boolean> {
    return true;
  }
}

export default KeyvSqlite;
