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
import type { DatabaseSync } from 'node:sqlite';
import { getTenantId, SYSTEM_TENANT_ID } from '~/config/tenantContext';
import {
  matchesFilter,
  applyUpdate,
  projectDoc,
  sortDocs,
  equalitySeed,
  objectId,
  coerceId,
  deepCoerceIds,
  getPath,
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
  /**
   * Enables tenant isolation, mirroring the mongoose `applyTenantIsolation`
   * plugin: every query filter is scoped to the current `tenantId`, inserts are
   * stamped with it, and update payloads may not mutate `tenantId`. Required for
   * collections that carry the plugin upstream (Config, Skill, SkillFile,
   * SystemGrant). Fail-closed under `TENANT_ISOLATION_STRICT=true`.
   */
  tenantIsolated?: boolean;
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
  private readonly tenantIsolated: boolean;
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
    this.tenantIsolated = spec.tenantIsolated ?? false;
    this.ensureTable(spec);
  }

  /* ------------------------------------------------------- tenant isolation */

  private static tenantStrict(): boolean {
    return process.env.TENANT_ISOLATION_STRICT === 'true';
  }

  /** Scopes a filter to the active tenant (mirrors the plugin query middleware). */
  private scopeFilter(filter: Filter): Filter {
    if (!this.tenantIsolated) {
      return filter;
    }
    const tenantId = getTenantId();
    if (!tenantId) {
      if (DocModel.tenantStrict()) {
        throw new Error('[TenantIsolation] Query attempted without tenant context in strict mode');
      }
      return filter;
    }
    if (tenantId === SYSTEM_TENANT_ID) {
      return filter;
    }
    return { $and: [filter, { tenantId }] };
  }

  /** Stamps tenantId onto an inserted doc (mirrors the plugin save/insertMany hook). */
  private stampTenant(doc: Doc): void {
    if (!this.tenantIsolated) {
      return;
    }
    const tenantId = getTenantId();
    if (!tenantId) {
      if (DocModel.tenantStrict()) {
        throw new Error('[TenantIsolation] Save attempted without tenant context in strict mode');
      }
      return;
    }
    if (tenantId === SYSTEM_TENANT_ID) {
      return;
    }
    if (doc.tenantId == null) {
      doc.tenantId = tenantId;
    } else if (DocModel.tenantStrict() && doc.tenantId !== tenantId) {
      throw new Error('[TenantIsolation] Document tenantId does not match current tenant context');
    }
  }

  /** Strips tenantId mutations from an update (mirrors the plugin update guard). */
  private sanitizeTenantUpdate(update: Update): void {
    if (!this.tenantIsolated) {
      return;
    }
    const tenantId = getTenantId();
    if (tenantId === SYSTEM_TENANT_ID) {
      return;
    }
    const stripValue = (payload: unknown): void => {
      if (payload && typeof payload === 'object' && 'tenantId' in (payload as Doc)) {
        if (tenantId && (payload as Doc).tenantId !== tenantId) {
          throw new Error('[TenantIsolation] Cross-tenant tenantId mutation is not allowed');
        }
        delete (payload as Doc).tenantId;
      }
    };
    stripValue(update.$set);
    stripValue(update.$setOnInsert);
    for (const op of ['$unset', '$rename'] as const) {
      const payload = update[op] as Doc | undefined;
      if (payload && 'tenantId' in payload) {
        delete payload.tenantId;
      }
    }
    stripValue(update);
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
        const c = coerceId(cond); // ObjectId -> hex string, so it can anchor
        const isScalar = c == null || typeof c !== 'object' || c instanceof Date;
        if (isScalar && c != null) {
          // json_each iterates array elements AND yields a scalar field as one
          // row, so this equality anchor is correct for BOTH scalar fields and
          // array-contains (Mongo {field: value} over an array) — and remains a
          // superset prefilter (the JS matcher is authoritative).
          clauses.push(`EXISTS (SELECT 1 FROM json_each(doc, '$.${key}') WHERE value = ?)`);
          // node:sqlite binds only null/number/bigint/string/blob. json_each
          // yields 1/0 for JSON booleans, so map booleans; dates -> ISO.
          const param =
            c instanceof Date ? c.toISOString() : typeof c === 'boolean' ? (c ? 1 : 0) : c;
          params.push(param);
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
  private candidates(rawFilter: Filter): Doc[] {
    const filter = this.scopeFilter(rawFilter);
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
    this.stampTenant(doc);
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

  findById(id: string, projection?: string | Record<string, 0 | 1>): QueryBuilder {
    return new QueryBuilder(this, { _id: id }, { single: true, projection });
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
    this.sanitizeTenantUpdate(m.update);
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
    const inserted = this.insertDoc(seeded);
    // Mongoose semantics: on an upsert-insert, `new:false` returns null (there is
    // no pre-image). upsertSkillFile relies on this for new-vs-replace detection.
    return returnNew ? inserted : null;
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
    this.sanitizeTenantUpdate(update);
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
    this.sanitizeTenantUpdate(update);
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

  /** Mongoose `exists`: returns `{ _id }` of the first match, else null. */
  async exists(filter: Filter = {}): Promise<{ _id: string } | null> {
    const doc = this.candidates(filter)[0];
    return doc ? { _id: doc._id as string } : null;
  }

  /**
   * Aggregation pipeline — the bounded stage set the chat methods use:
   * `$match $lookup $unwind $sort $limit $project`. Runs in JS over candidate
   * docs. `$lookup` resolves `from` (a mongo collection name) to a sibling model
   * via the naive singular-capitalized mapping (`prompts` -> `Prompt`).
   */
  async aggregate(pipeline: Array<Record<string, unknown>>): Promise<Doc[]> {
    let docs = this.candidates({});
    for (const stage of pipeline) {
      const op = Object.keys(stage)[0];
      if (op === '$match') {
        const f = stage.$match as Filter;
        docs = docs.filter((d) => matchesFilter(d, f));
      } else if (op === '$lookup') {
        const { from, localField, foreignField, as } = stage.$lookup as {
          from: string;
          localField: string;
          foreignField: string;
          as: string;
        };
        const modelName = from.charAt(0).toUpperCase() + from.slice(1).replace(/s$/, '');
        const target = this.resolver?.(modelName);
        docs = docs.map((d) => {
          const local = coerceId(getPath(d, localField));
          const joined = target ? target.candidates({ [foreignField]: local }) : [];
          return { ...d, [as]: joined };
        });
      } else if (op === '$unwind') {
        const spec = stage.$unwind as string | { path: string; preserveNullAndEmptyArrays?: boolean };
        const path = (typeof spec === 'string' ? spec : spec.path).replace(/^\$/, '');
        const preserve = typeof spec === 'object' && spec.preserveNullAndEmptyArrays === true;
        const out: Doc[] = [];
        for (const d of docs) {
          const v = getPath(d, path);
          if (Array.isArray(v)) {
            for (const el of v) {
              out.push({ ...d, [path]: el });
            }
            if (v.length === 0 && preserve) {
              const c = { ...d };
              delete c[path];
              out.push(c);
            }
          } else if (v != null) {
            out.push(d);
          } else if (preserve) {
            const c = { ...d };
            delete c[path];
            out.push(c);
          }
        }
        docs = out;
      } else if (op === '$group') {
        docs = groupStage(docs, stage.$group as Record<string, unknown>);
      } else if (op === '$sort') {
        docs = sortDocs(docs, stage.$sort as SortSpec);
      } else if (op === '$limit') {
        docs = docs.slice(0, stage.$limit as number);
      } else if (op === '$project') {
        docs = docs.map((d) => projectDoc(d, stage.$project as Record<string, 0 | 1>));
      }
    }
    return docs;
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
    const doc = structuredClone(deepCoerceIds(input) as Doc);
    this.stampTimestamps(doc, true, true);
    return hydrate(this.insertDoc(doc));
  }

  /**
   * Exact by-`_id` upsert — the shared primitive for the dual-write mirror and
   * the Mongo→SQLite backfill. Writes the document verbatim: ObjectId-like
   * values coerced to hex (so a doc read from a mongoose `.lean()` serializes
   * correctly), Dates preserved, keyed by the document's own `_id`. NO timestamp
   * stamping, NO schema defaults, NO tenant scoping — the source store already
   * owns those. Idempotent: re-running with the same `_id` replaces the row, so
   * the backfill and live mirroring converge on the same keyspace and never
   * duplicate (both sides key on the primary store's `_id`).
   */
  upsertRaw(input: Doc): void {
    const doc = deepCoerceIds(input) as Doc;
    const id = doc._id;
    if (id == null) {
      throw new Error(`[DocModel:${this.modelName}] upsertRaw requires _id`);
    }
    this.db
      .prepare(`INSERT OR REPLACE INTO ${this.table} (_id, doc) VALUES (?, ?)`)
      .run(String(id), this.serialize(doc));
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
          this.sanitizeTenantUpdate(update);
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
          const doc = structuredClone(deepCoerceIds(document) as Doc);
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

  /** No-op: node:sqlite is a single connection; Mongo sessions don't apply. */
  session(_session?: unknown): this {
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

/** Resolves a `$field` reference (or literal) against a doc, for aggregate exprs. */
function resolveExpr(expr: unknown, doc: Doc): unknown {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getPath(doc, expr.slice(1));
  }
  return expr;
}

/**
 * `$group` stage: groups candidate docs by `_id` and applies accumulators. The
 * accumulator set the chat methods use — `$sum` (count/field), plus the cheap
 * adjacent `$first/$last/$max/$min/$push/$addToSet`.
 */
function groupStage(docs: Doc[], spec: Record<string, unknown>): Doc[] {
  const groups = new Map<string, Doc>();
  const order: string[] = [];
  for (const doc of docs) {
    const key = resolveExpr(spec._id, doc);
    const keyStr = JSON.stringify(key ?? null);
    let g = groups.get(keyStr);
    if (!g) {
      g = { _id: key ?? null };
      groups.set(keyStr, g);
      order.push(keyStr);
    }
    for (const [field, acc] of Object.entries(spec)) {
      if (field === '_id') {
        continue;
      }
      const accOp = Object.keys(acc as object)[0];
      const arg = (acc as Record<string, unknown>)[accOp];
      const val = resolveExpr(arg, doc);
      switch (accOp) {
        case '$sum':
          g[field] = ((g[field] as number) ?? 0) + (Number(val) || 0);
          break;
        case '$first':
          if (!(field in g)) {
            g[field] = val;
          }
          break;
        case '$last':
          g[field] = val;
          break;
        case '$max':
          if (!(field in g) || compareValuesForGroup(val, g[field]) > 0) {
            g[field] = val;
          }
          break;
        case '$min':
          if (!(field in g) || compareValuesForGroup(val, g[field]) < 0) {
            g[field] = val;
          }
          break;
        case '$push':
          (g[field] = (g[field] as unknown[]) ?? []).push(val);
          break;
        case '$addToSet':
          g[field] = (g[field] as unknown[]) ?? [];
          if (!(g[field] as unknown[]).some((x) => JSON.stringify(x) === JSON.stringify(val))) {
            (g[field] as unknown[]).push(val);
          }
          break;
        default:
          break;
      }
    }
  }
  return order.map((k) => groups.get(k) as Doc);
}

function compareValuesForGroup(a: unknown, b: unknown): number {
  if (a === b) return 0;
  return (a as number) > (b as number) ? 1 : -1;
}

/** Extracts the `_id` from a ref value (a doc or an id), mirroring mongoose casting. */
function refId(v: unknown): unknown {
  if (v != null && typeof v === 'object' && '_id' in (v as Doc)) {
    return String((v as Doc)._id);
  }
  return v;
}
