/**
 * SQLite-backed document model presenting the subset of the Mongoose Model API
 * that the chat data-access methods use. Documents are stored as JSON (`doc`
 * column) keyed by `_id`; query semantics are delegated to the pure engine so
 * behavior matches MongoDB exactly. Index-accelerated by extracting equality
 * anchors (user / id fields) from filters; the authoritative match always runs
 * in JS via `matchesFilter`.
 *
 * No mongoose. No tenant middleware (Conversation/Message are not tenant-plugged
 * upstream; collections that are — skill/config/systemGrant — declare it in their
 * CollectionSpec when migrated). MeiliSearch stays a separate concern: `.meiliSearch`
 * is intentionally absent, matching a mongoose model with no MEILI_HOST configured.
 */
import { DatabaseSync } from 'node:sqlite';
import {
  matchesFilter,
  applyUpdate,
  projectDoc,
  sortDocs,
  equalitySeed,
  objectId,
  type Doc,
  type Filter,
  type Update,
  type SortSpec,
} from './engine';

export interface CollectionSpec {
  /** Collection / table name (matches the mongoose model name). */
  name: string;
  /**
   * Unique constraints. A `string` is a single-field global unique (e.g.
   * `conversationId`); a `string[]` is a compound unique (e.g. `['tag','user']`).
   */
  unique?: Array<string | string[]>;
  /** Fields to index for query acceleration (equality anchors + range/sort). */
  index?: string[];
  /** Fields stored as dates; rehydrated to `Date` on read to match `.lean()`. */
  dateFields?: string[];
  /**
   * ObjectId-ref array/scalar fields → target collection name (e.g.
   * `{ messages: 'Message' }`). On write, assigned documents are cast to their
   * `_id` (mirroring mongoose ref casting); `.populate()` resolves them back.
   */
  refs?: Record<string, string>;
  /**
   * Schema defaults applied on insert when the field is absent (mirrors
   * mongoose `default:`). Only declare fields that are *queried* (e.g.
   * `SharedLink.isPublic`), where a missing value would change filter results.
   */
  defaults?: Record<string, unknown>;
}

interface WriteResult {
  acknowledged: true;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId: string | null;
}

interface DeleteResult {
  acknowledged: true;
  deletedCount: number;
}

interface BulkResult {
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: Record<number, string>;
  insertedIds: Record<number, string>;
}

const SQL_SAFE_FIELD = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class DocModel {
  readonly modelName: string;
  private readonly db: DatabaseSync;
  private readonly dateFields: Set<string>;
  private readonly anchorFields: Set<string>;
  private readonly refs: Record<string, string>;
  private readonly defaults: Record<string, unknown>;
  /** Resolves sibling collections for `.populate()`; wired by createSqliteHandle. */
  resolver?: (name: string) => DocModel | undefined;

  constructor(db: DatabaseSync, spec: CollectionSpec) {
    this.db = db;
    this.modelName = spec.name;
    this.dateFields = new Set(spec.dateFields ?? ['createdAt', 'updatedAt', 'expiredAt']);
    const uniqueFields = (spec.unique ?? []).flatMap((u) => (Array.isArray(u) ? u : [u]));
    this.anchorFields = new Set([...uniqueFields, ...(spec.index ?? [])]);
    this.refs = spec.refs ?? {};
    this.defaults = spec.defaults ?? {};
    this.ensureTable(spec);
  }

  private ensureTable(spec: CollectionSpec): void {
    this.assertField(this.modelName);
    const t = this.table;
    const n = this.modelName;
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${t} (_id TEXT PRIMARY KEY, doc TEXT NOT NULL)`);
    for (const u of spec.unique ?? []) {
      const fields = Array.isArray(u) ? u : [u];
      fields.forEach((f) => this.assertField(f));
      const cols = fields.map((f) => `json_extract(doc, '$.${f}')`).join(', ');
      this.db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ux_${n}_${fields.join('_')}" ON ${t} (${cols})`,
      );
    }
    for (const field of spec.index ?? []) {
      this.assertField(field);
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS "ix_${n}_${field}" ON ${t} (json_extract(doc, '$.${field}'))`,
      );
    }
  }

  /** Casts ref fields to `_id` on write, mirroring mongoose ObjectId-ref casting. */
  private castRefs(doc: Doc): void {
    for (const field of Object.keys(this.refs)) {
      const v = doc[field];
      if (Array.isArray(v)) {
        doc[field] = v.map(refId);
      } else if (v != null) {
        doc[field] = refId(v);
      }
    }
  }

  /** Fetches a doc by `_id` and applies a projection — used by `.populate()`. */
  getByIdProjected(id: string, projection?: string | Record<string, 0 | 1>): Doc | null {
    const doc = this.getRawById(id);
    return doc ? projectDoc(doc, projection) : null;
  }

  private get table(): string {
    return `"${this.modelName}"`;
  }

  private assertField(field: string): void {
    if (!SQL_SAFE_FIELD.test(field)) {
      throw new Error(`[DocModel:${this.modelName}] unsafe index field: ${field}`);
    }
  }

  /* --------------------------------------------------------- read helpers */

  private rehydrate(raw: string): Doc {
    const doc = JSON.parse(raw) as Doc;
    for (const field of this.dateFields) {
      const v = doc[field];
      if (typeof v === 'string' && v.length > 0) {
        doc[field] = new Date(v);
      }
    }
    return doc;
  }

  /** Builds an indexed prefilter from top-level and $and equality clauses. */
  private anchorWhere(filter: Filter): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const consider = (f: Filter): void => {
      for (const [key, cond] of Object.entries(f)) {
        if (key === '$and' && Array.isArray(cond)) {
          for (const sub of cond) {
            consider(sub as Filter);
          }
          continue;
        }
        if (key.startsWith('$')) {
          continue;
        }
        if (!this.anchorFields.has(key)) {
          continue;
        }
        const isScalar =
          cond == null || typeof cond !== 'object' || cond instanceof Date;
        if (isScalar && cond != null) {
          clauses.push(`json_extract(doc, '$.${key}') = ?`);
          params.push(cond instanceof Date ? cond.toISOString() : cond);
        }
      }
    };
    consider(filter);
    return {
      sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  /** Candidate rows narrowed by index anchors, then authoritatively JS-filtered. */
  private candidates(filter: Filter): Doc[] {
    const { sql, params } = this.anchorWhere(filter);
    const rows = this.db.prepare(`SELECT doc FROM ${this.table}${sql}`).all(...(params as never[]));
    const out: Doc[] = [];
    for (const row of rows as Array<{ doc: string }>) {
      const doc = this.rehydrate(row.doc);
      if (matchesFilter(doc, filter)) {
        out.push(doc);
      }
    }
    return out;
  }

  private getRawById(id: string): Doc | null {
    const row = this.db.prepare(`SELECT doc FROM ${this.table} WHERE _id = ?`).get(id) as
      | { doc: string }
      | undefined;
    return row ? this.rehydrate(row.doc) : null;
  }

  /* --------------------------------------------------------- write helpers */

  private serialize(doc: Doc): string {
    return JSON.stringify(doc);
  }

  private insertDoc(doc: Doc): Doc {
    if (!doc._id) {
      doc._id = objectId();
    }
    for (const [k, v] of Object.entries(this.defaults)) {
      if (!(k in doc) || doc[k] === undefined) {
        doc[k] = v;
      }
    }
    this.castRefs(doc);
    this.db
      .prepare(`INSERT INTO ${this.table} (_id, doc) VALUES (?, ?)`)
      .run(doc._id as string, this.serialize(doc));
    return doc;
  }

  private replaceDoc(doc: Doc): void {
    this.castRefs(doc);
    this.db
      .prepare(`UPDATE ${this.table} SET doc = ? WHERE _id = ?`)
      .run(this.serialize(doc), doc._id as string);
  }

  private stampTimestamps(doc: Doc, isInsert: boolean, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    const now = new Date();
    if (isInsert && doc.createdAt === undefined) {
      doc.createdAt = now;
    }
    doc.updatedAt = now;
  }

  /* ------------------------------------------------------------- Model API */

  findOne(filter: Filter = {}, projection?: string | Record<string, 0 | 1>): QueryBuilder {
    return new QueryBuilder(this, filter, { single: true, projection });
  }

  find(filter: Filter = {}, projection?: string | Record<string, 0 | 1>): QueryBuilder {
    return new QueryBuilder(this, filter, { single: false, projection });
  }

  /** Internal: executes a find/findOne with projection/sort/limit/skip/lean/populate. */
  execQuery(opts: {
    filter: Filter;
    single: boolean;
    projection?: string | Record<string, 0 | 1>;
    sort?: SortSpec;
    limit?: number;
    skip?: number;
    lean: boolean;
    populate?: Array<{ path: string; select?: string | Record<string, 0 | 1> }>;
    deleteAfter?: boolean;
    mutate?: { update: Update; upsert?: boolean; new?: boolean; timestamps?: boolean };
  }): Doc | Doc[] | null {
    // findOneAndUpdate: perform the write, then project/populate/lean the result.
    if (opts.mutate) {
      const resultDoc = this.mutateOne(opts.filter, opts.mutate);
      let docs = resultDoc ? [resultDoc] : [];
      if (opts.populate?.length) {
        for (const d of docs) {
          this.applyPopulate(d, opts.populate);
        }
      }
      docs = docs.map((d) => projectDoc(d, opts.projection));
      if (!opts.lean) {
        docs = docs.map((d) => hydrate(d));
      }
      return docs[0] ?? null;
    }

    let docs = this.candidates(opts.filter);
    if (opts.sort) {
      docs = sortDocs(docs, opts.sort);
    }
    if (opts.skip) {
      docs = docs.slice(opts.skip);
    }
    if (opts.single) {
      docs = docs.slice(0, 1);
    } else if (opts.limit != null) {
      docs = docs.slice(0, opts.limit);
    }
    if (opts.deleteAfter) {
      const del = this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`);
      for (const d of docs) {
        del.run(d._id as string);
      }
    }
    if (opts.populate?.length) {
      for (const d of docs) {
        this.applyPopulate(d, opts.populate);
      }
    }
    docs = docs.map((d) => projectDoc(d, opts.projection));
    if (!opts.lean) {
      docs = docs.map((d) => hydrate(d));
    }
    if (opts.single) {
      return docs[0] ?? null;
    }
    return docs;
  }

  private applyPopulate(
    doc: Doc,
    populate: Array<{ path: string; select?: string | Record<string, 0 | 1> }>,
  ): void {
    for (const { path, select } of populate) {
      const target = this.resolver?.(this.refs[path]);
      if (!target) {
        continue;
      }
      const v = doc[path];
      if (Array.isArray(v)) {
        doc[path] = v
          .map((id) => target.getByIdProjected(String(id), select))
          .filter((d): d is Doc => d != null);
      } else if (v != null) {
        doc[path] = target.getByIdProjected(String(v), select);
      }
    }
  }

  /** Core write for findOneAndUpdate/findByIdAndUpdate. Returns the raw doc. */
  private mutateOne(
    filter: Filter,
    m: { update: Update; upsert?: boolean; new?: boolean; timestamps?: boolean },
  ): Doc | null {
    const returnNew = m.new ?? false;
    const timestamps = m.timestamps ?? true;
    const existing = this.candidates(filter)[0] ?? null;
    if (existing) {
      const updated = applyUpdate(existing, m.update, false);
      this.stampTimestamps(updated, false, timestamps);
      updated._id = existing._id;
      this.replaceDoc(updated);
      return returnNew ? updated : existing;
    }
    if (!m.upsert) {
      return null;
    }
    const seeded = applyUpdate(equalitySeed(filter), m.update, true);
    this.stampTimestamps(seeded, true, timestamps);
    return this.insertDoc(seeded);
  }

  findByIdAndUpdate(
    id: string,
    update: Update,
    options: { new?: boolean; timestamps?: boolean; lean?: boolean } = {},
  ): QueryBuilder {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  findOneAndDelete(filter: Filter, projection?: string | Record<string, 0 | 1>): QueryBuilder {
    return new QueryBuilder(this, filter, { single: true, projection, deleteAfter: true });
  }

  findOneAndUpdate(
    filter: Filter,
    update: Update,
    options: { upsert?: boolean; new?: boolean; timestamps?: boolean; lean?: boolean } = {},
  ): QueryBuilder {
    const qb = new QueryBuilder(this, filter, {
      single: true,
      mutate: {
        update,
        upsert: options.upsert,
        new: options.new,
        timestamps: options.timestamps,
      },
    });
    if (options.lean) {
      qb.lean();
    }
    return qb;
  }

  async updateOne(
    filter: Filter,
    update: Update,
    options: { upsert?: boolean; timestamps?: boolean } = {},
  ): Promise<WriteResult> {
    const timestamps = options.timestamps ?? true;
    const existing = this.candidates(filter)[0] ?? null;
    if (existing) {
      const updated = applyUpdate(existing, update, false);
      this.stampTimestamps(updated, false, timestamps);
      updated._id = existing._id;
      this.replaceDoc(updated);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
    }
    if (options.upsert) {
      const seeded = applyUpdate(equalitySeed(filter), update, true);
      this.stampTimestamps(seeded, true, timestamps);
      const inserted = this.insertDoc(seeded);
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: inserted._id as string,
      };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null };
  }

  async updateMany(
    filter: Filter,
    update: Update,
    options: { timestamps?: boolean } = {},
  ): Promise<WriteResult> {
    const timestamps = options.timestamps ?? true;
    const docs = this.candidates(filter);
    for (const existing of docs) {
      const updated = applyUpdate(existing, update, false);
      this.stampTimestamps(updated, false, timestamps);
      updated._id = existing._id;
      this.replaceDoc(updated);
    }
    return {
      acknowledged: true,
      matchedCount: docs.length,
      modifiedCount: docs.length,
      upsertedCount: 0,
      upsertedId: null,
    };
  }

  async deleteMany(filter: Filter = {}): Promise<DeleteResult> {
    const docs = this.candidates(filter);
    const del = this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`);
    for (const doc of docs) {
      del.run(doc._id as string);
    }
    return { acknowledged: true, deletedCount: docs.length };
  }

  async deleteOne(filter: Filter = {}): Promise<DeleteResult> {
    const doc = this.candidates(filter)[0];
    if (!doc) {
      return { acknowledged: true, deletedCount: 0 };
    }
    this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`).run(doc._id as string);
    return { acknowledged: true, deletedCount: 1 };
  }

  async countDocuments(filter: Filter = {}): Promise<number> {
    return this.candidates(filter).length;
  }

  async distinct(field: string, filter: Filter = {}): Promise<unknown[]> {
    const seen = new Set<unknown>();
    const out: unknown[] = [];
    for (const doc of this.candidates(filter)) {
      const v = doc[field];
      const values = Array.isArray(v) ? v : [v];
      for (const el of values) {
        const key = el instanceof Date ? el.getTime() : el;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(el);
        }
      }
    }
    return out;
  }

  async create(input: Doc | Doc[]): Promise<Doc | Doc[]> {
    if (Array.isArray(input)) {
      return input.map((d) => this.createOne(d));
    }
    return this.createOne(input);
  }

  async insertMany(docs: Doc[]): Promise<Doc[]> {
    return docs.map((d) => this.createOne(d));
  }

  private createOne(input: Doc): Doc {
    const doc = structuredClone(input);
    this.stampTimestamps(doc, true, true);
    return hydrate(this.insertDoc(doc));
  }

  async bulkWrite(
    ops: Array<Record<string, unknown>>,
  ): Promise<BulkResult> {
    const result: BulkResult = {
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
      insertedIds: {},
    };
    this.db.exec('BEGIN');
    try {
      ops.forEach((op, i) => {
        if ('updateOne' in op) {
          const { filter, update, upsert, timestamps } = op.updateOne as {
            filter: Filter;
            update: Update;
            upsert?: boolean;
            timestamps?: boolean;
          };
          const enabled = timestamps ?? true;
          const existing = this.candidates(filter)[0] ?? null;
          if (existing) {
            const updated = applyUpdate(existing, update, false);
            this.stampTimestamps(updated, false, enabled);
            updated._id = existing._id;
            this.replaceDoc(updated);
            result.matchedCount++;
            result.modifiedCount++;
          } else if (upsert) {
            const seeded = applyUpdate(equalitySeed(filter), update, true);
            this.stampTimestamps(seeded, true, enabled);
            const inserted = this.insertDoc(seeded);
            result.upsertedCount++;
            result.upsertedIds[i] = inserted._id as string;
          }
        } else if ('insertOne' in op) {
          const { document } = op.insertOne as { document: Doc };
          const doc = structuredClone(document);
          this.stampTimestamps(doc, true, true);
          const inserted = this.insertDoc(doc);
          result.insertedCount++;
          result.insertedIds[i] = inserted._id as string;
        } else if ('deleteOne' in op) {
          const { filter } = op.deleteOne as { filter: Filter };
          const doc = this.candidates(filter)[0];
          if (doc) {
            this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`).run(doc._id as string);
            result.deletedCount++;
          }
        } else if ('deleteMany' in op) {
          const { filter } = op.deleteMany as { filter: Filter };
          for (const doc of this.candidates(filter)) {
            this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`).run(doc._id as string);
            result.deletedCount++;
          }
        } else if ('updateMany' in op) {
          const { filter, update } = op.updateMany as { filter: Filter; update: Update };
          for (const existing of this.candidates(filter)) {
            const updated = applyUpdate(existing, update, false);
            this.stampTimestamps(updated, false, true);
            updated._id = existing._id;
            this.replaceDoc(updated);
            result.matchedCount++;
            result.modifiedCount++;
          }
        }
      });
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return result;
  }
}

/* --------------------------------------------------------- query builder */

/**
 * Thenable chainable query for `find`/`findOne`. Mirrors the Mongoose query
 * surface the methods use: `.select() .sort() .limit() .skip() .lean()
 * .deleteMany()` and awaiting resolves the documents.
 */
export class QueryBuilder implements PromiseLike<Doc | Doc[] | null> {
  private projection?: string | Record<string, 0 | 1>;
  private sortSpec?: SortSpec;
  private limitN?: number;
  private skipN?: number;
  private leanFlag = false;
  private populates: Array<{ path: string; select?: string | Record<string, 0 | 1> }> = [];

  constructor(
    private readonly model: DocModel,
    private readonly filter: Filter,
    private readonly opts: {
      single: boolean;
      projection?: string | Record<string, 0 | 1>;
      deleteAfter?: boolean;
      mutate?: { update: Update; upsert?: boolean; new?: boolean; timestamps?: boolean };
    },
  ) {
    this.projection = opts.projection;
  }

  select(projection: string | Record<string, 0 | 1>): this {
    this.projection = projection;
    return this;
  }

  populate(
    spec: string | { path: string; select?: string | Record<string, 0 | 1> },
  ): this {
    this.populates.push(typeof spec === 'string' ? { path: spec } : spec);
    return this;
  }

  sort(spec: SortSpec | string): this {
    if (typeof spec === 'string') {
      const parsed: SortSpec = {};
      for (const token of spec.split(/\s+/).filter(Boolean)) {
        if (token.startsWith('-')) {
          parsed[token.slice(1)] = -1;
        } else {
          parsed[token] = 1;
        }
      }
      this.sortSpec = parsed;
    } else {
      this.sortSpec = spec;
    }
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  skip(n: number): this {
    this.skipN = n;
    return this;
  }

  lean<T = Doc>(): QueryBuilder & PromiseLike<T> {
    this.leanFlag = true;
    return this as unknown as QueryBuilder & PromiseLike<T>;
  }

  exec(): Promise<Doc | Doc[] | null> {
    return Promise.resolve(
      this.model.execQuery({
        filter: this.filter,
        single: this.opts.single,
        projection: this.projection,
        sort: this.sortSpec,
        limit: this.limitN,
        skip: this.skipN,
        lean: this.leanFlag,
        populate: this.populates.length ? this.populates : undefined,
        deleteAfter: this.opts.deleteAfter,
        mutate: this.opts.mutate,
      }),
    );
  }

  /** `Model.find(A).deleteMany(B)` deletes docs matching A AND B. */
  deleteMany(extra: Filter = {}): Promise<{ acknowledged: true; deletedCount: number }> {
    return this.model.deleteMany({ $and: [this.filter, extra] });
  }

  then<TResult1 = Doc | Doc[] | null, TResult2 = never>(
    onfulfilled?: ((value: Doc | Doc[] | null) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<Doc | Doc[] | null | TResult> {
    return this.exec().catch(onrejected);
  }
}

/* ------------------------------------------------------------- hydration */

/**
 * Adds the Mongoose hydrated-document surface the methods touch:
 * `.toObject()`, `.$isDefault()`. `$isDefault` returns false (fields in this
 * store are always explicitly persisted; the callers' `== null` branch covers
 * the unset case, so the return value never changes observable state — it only
 * gates a redundant idempotent write).
 */
function hydrate(doc: Doc): Doc {
  Object.defineProperty(doc, 'toObject', {
    value: () => structuredClone(stripMethods(doc)),
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(doc, '$isDefault', {
    value: () => false,
    enumerable: false,
    configurable: true,
  });
  return doc;
}

function stripMethods(doc: Doc): Doc {
  const out: Doc = {};
  for (const key of Object.keys(doc)) {
    out[key] = doc[key];
  }
  return out;
}

/** Extracts the `_id` from a ref value (a doc or an id), mirroring mongoose casting. */
function refId(v: unknown): unknown {
  if (v != null && typeof v === 'object' && '_id' in (v as Doc)) {
    return String((v as Doc)._id);
  }
  return v;
}
