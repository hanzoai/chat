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
 * CollectionSpec when migrated).
 *
 * Search is a DERIVED view of this store, so the store announces what it wrote:
 * every committed change reaches `onMutate`, which `attachMeili` installs. Two
 * private primitives are the whole of it — `insertDoc`/`replaceDoc` for upserts,
 * `removeDocs` for deletes — and no write in this class goes around them.
 */
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
  hasPath,
  type Doc,
  type Filter,
  type Update,
  type SortSpec,
} from './engine';

/**
 * The minimal `better-sqlite3-multiple-ciphers` surface the store uses, declared
 * structurally instead of imported from the driver. The driver's shipped types
 * are large and conditional-generic-heavy (`prepare<...>` → `Statement<...>`);
 * pulling them into a consumer's program (`@hanzochat/api` imports this package's
 * public types) makes the TypeScript checker's structural-relation pass explode
 * (`recursiveTypeRelatedTo` → the build type-checks for >27 min and is canceled).
 * The real native handle satisfies this contract at runtime, unchanged.
 */
export interface SqliteStatement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  pragma(source: string): unknown;
  close(): void;
}

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

/** What a committed write did to one document. */
export type Change = 'upsert' | 'delete';

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
  private readonly db: SqliteDatabase;
  private readonly dateFields: Set<string>;
  private readonly anchorFields: Set<string>;
  private readonly refs: Record<string, string>;
  private readonly defaults: Record<string, unknown>;
  private readonly tenantIsolated: boolean;
  /** Resolves sibling collections for `.populate()`; wired by createSqliteHandle. */
  resolver?: (name: string) => DocModel | undefined;
  /**
   * Called once per document after a committed write, with the document as it
   * was written (`upsert`) or as it last existed (`delete`). `attachMeili`
   * installs it to drive the search index; unset, the store behaves identically.
   *
   * It MUST NOT throw. The write has already landed, so raising here would fail
   * a call whose data is safely on disk. `attachMeili` holds that end: its
   * handler is total and reports its own failures.
   */
  onMutate?: (change: Change, doc: Doc) => void;
  /**
   * Search this collection, hydrated from the store. `attachMeili` installs it
   * in the same pass as `onMutate`, so a collection that can be searched is a
   * collection whose writes are indexed — the two cannot come apart.
   */
  meiliSearch?: (
    query: string,
    params?: Record<string, unknown>,
    populate?: boolean,
  ) => Promise<{ hits: Array<Record<string, unknown>> }>;
  /**
   * Changes withheld while a transaction is open. `bulkWrite` can ROLL BACK,
   * and an index told about a write that then vanished holds rows the store
   * never kept — the same divergence this seam exists to prevent, arriving by a
   * different road. Collected here, released only once the COMMIT lands.
   */
  private pending: Array<[Change, Doc]> | null = null;

  constructor(db: SqliteDatabase, spec: CollectionSpec) {
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
          // The driver binds only null/number/bigint/string/Buffer (boolean and
          // undefined throw). json_each yields 1/0 for JSON booleans, so map
          // booleans to 1/0; dates -> ISO.
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

  /** Announces a committed change, or holds it until the open transaction commits. */
  private notify(change: Change, doc: Doc): void {
    if (!this.onMutate) {
      return;
    }
    if (this.pending) {
      this.pending.push([change, doc]);
      return;
    }
    this.onMutate(change, doc);
  }

  /**
   * Deletes documents that have ALREADY been read, and announces each one.
   *
   * It takes the documents rather than a filter, and that is the point. A
   * derived index is keyed by a FIELD of the document, so it can only be told
   * what to forget while the row still exists; a delete that starts from a
   * filter has nothing to hand on, and leaves the index serving rows the store
   * dropped — which looks exactly like search working. Passing `Doc[]` makes the
   * read a precondition of the type rather than a habit of the caller.
   *
   * Every delete in this class comes through here. There is no other DELETE.
   */
  private removeDocs(docs: Doc[]): number {
    const del = this.db.prepare(`DELETE FROM ${this.table} WHERE _id = ?`);
    for (const doc of docs) {
      del.run(doc._id as string);
      this.notify('delete', doc);
    }
    return docs.length;
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
    this.notify('upsert', doc);
    return doc;
  }

  private replaceDoc(doc: Doc): void {
    this.castRefs(doc);
    this.db
      .prepare(`UPDATE ${this.table} SET doc = ? WHERE _id = ?`)
      .run(this.serialize(doc), doc._id as string);
    this.notify('upsert', doc);
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
      // Before populate/projection, so what is announced is the whole document
      // that existed, not the shape this caller asked to see.
      this.removeDocs(docs);
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

  /** A SET, not a row: every matched document is read, deleted and announced. */
  async deleteMany(filter: Filter = {}): Promise<DeleteResult> {
    return { acknowledged: true, deletedCount: this.removeDocs(this.candidates(filter)) };
  }

  async deleteOne(filter: Filter = {}): Promise<DeleteResult> {
    const doc = this.candidates(filter)[0];
    return { acknowledged: true, deletedCount: this.removeDocs(doc ? [doc] : []) };
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
   * `$match $lookup $unwind $group $sort $limit $skip $project $facet`. Runs in JS over
   * candidate docs. `$lookup` resolves `from` (a mongo collection name) to a
   * sibling model via the naive singular-capitalized mapping
   * (`prompts` -> `Prompt`).
   *
   * Anything outside that set THROWS — it is never skipped. See the else branch
   * for why: a silently dropped stage returns a wrong answer that looks right.
   *
   * Known-unsupported and therefore loud: `$replaceRoot`, `$count`.
   *
   * `$project` and `$addFields` evaluate expressions via evalAggExpr —
   * `$arrayElemAt`, `$filter`, `$and`, `$eq`, and `$field` / `$$variable`
   * references. Anything else there throws too.
   */
  async aggregate(pipeline: Array<Record<string, unknown>>): Promise<Doc[]> {
    return this.runPipeline(this.candidates({}), pipeline);
  }

  /**
   * Evaluates `pipeline` over `input`. Split out of `aggregate` so `$facet` can
   * run its sub-pipelines through the SAME evaluator — one stage implementation,
   * not a second one that drifts.
   */
  private runPipeline(input: Doc[], pipeline: Array<Record<string, unknown>>): Doc[] {
    let docs = input;
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
        // "entries" singularizes to "entry", not "entrie" — the naive s-strip
        // turned 'aclentries' into 'Aclentrie' and the ACL migration joins threw.
        const singular = from.endsWith('ies') ? `${from.slice(0, -3)}y` : from.replace(/s$/, '');
        const modelName = singular.charAt(0).toUpperCase() + singular.slice(1);
        const target = this.resolver?.(modelName);
        if (!target) {
          // An unresolvable `from` used to yield [] for every document — a join
          // that quietly produced nothing, which reads exactly like "no matches".
          // That is how `from: 'accessroles'` (-> 'Accessrole', no such model)
          // silently emptied the ACL joins. Resolution is now case-insensitive,
          // and anything still unresolvable is loud.
          throw new Error(
            `aggregate $lookup: no model for from='${from}' (tried '${modelName}'). ` +
              `An unresolvable join is NOT silently empty — it throws, because ` +
              `returning [] is indistinguishable from a genuine no-match.`,
          );
        }
        docs = docs.map((d) => {
          const local = coerceId(getPath(d, localField));
          return { ...d, [as]: target.candidates({ [foreignField]: local }) };
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
      } else if (op === '$facet') {
        // Each key runs its own sub-pipeline over the SAME input docs, and the
        // whole stage collapses to ONE document mapping key -> results. That
        // single-doc shape is why callers destructure `const [facet] = await
        // aggregate(...)`. Previously unsupported, so the usage controller
        // silently reported all-zero spend to every customer.
        const spec = stage.$facet as Record<string, Array<Record<string, unknown>>>;
        const out: Doc = {};
        for (const [key, sub] of Object.entries(spec)) {
          out[key] = this.runPipeline(docs, sub);
        }
        docs = [out];
      } else if (op === '$skip') {
        // Was missing while $limit was present, so a paginated aggregate
        // silently returned page 1 for every page.
        docs = docs.slice(stage.$skip as number);
      } else if (op === '$project') {
        // An aggregate $project is NOT a find projection: alongside 0/1 it may
        // carry expressions. projectDoc only understands 0/1, so expression keys
        // were dropped without a word — that is how `accessRoleId:
        // { $arrayElemAt: [...] }` vanished from the permissions response.
        // Deliberately NOT taught to projectDoc: that function is shared with
        // find().select(), where expressions are not valid. Same name, two
        // different jobs; evaluating them here keeps find's semantics untouched.
        const spec = stage.$project as Record<string, unknown>;
        const flags: Record<string, 0 | 1> = {};
        const exprs: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(spec)) {
          if (v === 0 || v === 1) {
            flags[k] = v;
          } else {
            exprs[k] = v;
          }
        }
        const hasExprs = Object.keys(exprs).length > 0;
        docs = docs.map((d) => {
          // A projection that is only expressions still includes _id, matching
          // mongo; projectDoc handles that when any 1 is present.
          const base = projectDoc(d, hasExprs ? { ...flags, _id: flags._id ?? 1 } : flags);
          for (const [k, e] of Object.entries(exprs)) {
            base[k] = evalAggExpr(e, d);
          }
          return base;
        });
      } else if (op === '$addFields') {
        // Adds computed fields, keeping every existing one — the difference from
        // $project, which keeps only what it names. Every expression is evaluated
        // against the ORIGINAL document, so two fields added in one stage cannot
        // see each other, matching mongo.
        const spec = stage.$addFields as Record<string, unknown>;
        docs = docs.map((d) => {
          const out = { ...d };
          for (const [k, e] of Object.entries(spec)) {
            out[k] = evalAggExpr(e, d);
          }
          return out;
        });
      } else {
        // FAIL LOUD. This chain used to end here with no else, so an unsupported
        // stage was silently skipped and the pipeline returned a confident wrong
        // answer — which is strictly worse than throwing.
        //
        // What that actually cost: `$addFields` was unsupported, so all four
        // permission-migration pipelines matched ZERO documents and reported
        // "nothing to migrate". Anyone who ran them migrated nothing and was
        // told it worked. `$facet` was unsupported, so the usage controller
        // returned all-zero usage, and `$skip` was missing entirely so a
        // paginated aggregate returned page 1 forever — all now implemented.
        //
        // Adding a stage means implementing it here — not adding it to a doc
        // comment. Throwing is what makes that non-optional.
        throw new Error(
          `aggregate: unsupported stage ${op}. Supported: $match $lookup $unwind ` +
            `$group $sort $limit $skip $project $addFields $facet. An unsupported stage ` +
            `is NOT skipped — it throws, because silently dropping a stage returns a ` +
            `plausible wrong answer (a filter that never applied, a count that is zero).`,
        );
      }
    }
    return docs;
  }

  /**
   * Mongo `distinct`: the deduped set of `field` across docs matching `filter`.
   * Resolves dotted paths and, like Mongo, SKIPS documents where the path is
   * absent — a missing path contributes nothing rather than `undefined`. (An
   * explicit `null` is present, so it is kept.) Array values fan out per element.
   */
  async distinct(field: string, filter: Filter = {}): Promise<unknown[]> {
    const seen = new Set<unknown>();
    const out: unknown[] = [];
    for (const doc of this.candidates(filter)) {
      if (!hasPath(doc, field)) {
        continue;
      }
      const v = getPath(doc, field);
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
   *
   * It announces nothing either, for the same reason: this is a bulk import, and
   * a per-document notification would be one fire-and-forget index request per
   * imported row. History is indexed in one pass by `backfillMeili`
   * (`config/backfill-index.js`), which batches. Do not use this for a live
   * write — that is what `create` / `updateOne` are for.
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
    // Held until the COMMIT: a batch that rolls back wrote nothing, so it must
    // have announced nothing.
    const held: Array<[Change, Doc]> = [];
    this.pending = held;
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
          result.deletedCount += this.removeDocs(doc ? [doc] : []);
        } else if ('deleteMany' in op) {
          const { filter } = op.deleteMany as { filter: Filter };
          result.deletedCount += this.removeDocs(this.candidates(filter));
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
    } finally {
      this.pending = null;
    }
    for (const [change, doc] of held) {
      this.notify(change, doc);
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
export class QueryBuilder implements PromiseLike<Doc | Doc[] | null | unknown[]> {
  private projection?: string | Record<string, 0 | 1>;
  private sortSpec?: SortSpec;
  private limitN?: number;
  private skipN?: number;
  private leanFlag = false;
  private distinctField?: string;
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

  /**
   * Mongoose `Query.prototype.distinct(field)`: the deduped set of `field`
   * across all docs matching this query's filter. Chainable and terminal —
   * awaiting resolves to the value array (a following `.lean()` is a no-op, as
   * distinct yields raw scalars, matching mongoose). Delegates to the model's
   * distinct so filter/tenant scoping stay identical to `.find()`.
   */
  distinct(field: string): this {
    this.distinctField = field;
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

  /** No-op: the store is a single connection; Mongo sessions don't apply. */
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

  exec(): Promise<Doc | Doc[] | null | unknown[]> {
    if (this.distinctField != null) {
      return this.model.distinct(this.distinctField, this.filter);
    }
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

  then<TResult1 = Doc | Doc[] | null | unknown[], TResult2 = never>(
    onfulfilled?: ((value: Doc | Doc[] | null | unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<Doc | Doc[] | null | unknown[] | TResult> {
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

/**
 * Resolves a `$field` reference, a `$$variable` binding, or a literal.
 *
 * `$$name` / `$$name.path` reads a binding introduced by an enclosing `$filter`
 * — it is NOT a field of the document, and resolving it as one would silently
 * yield undefined.
 */
function resolveExpr(expr: unknown, doc: Doc, vars: Record<string, unknown> = {}): unknown {
  if (typeof expr === 'string' && expr.startsWith('$$')) {
    const ref = expr.slice(2);
    const dot = ref.indexOf('.');
    const name = dot === -1 ? ref : ref.slice(0, dot);
    if (!(name in vars)) {
      const inScope = Object.keys(vars).map((v) => `$$${v}`).join(', ') || '(none)';
      throw new Error(
        `aggregate: undefined variable $$${name}. In scope: ${inScope}. An unbound ` +
          `variable is NOT undefined — it throws, because comparing undefined to ` +
          `anything quietly yields false and reads like a real, empty result.`,
      );
    }
    const base = vars[name];
    return dot === -1 ? base : getPath(base as Doc, ref.slice(dot + 1));
  }
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getPath(doc, expr.slice(1));
  }
  return expr;
}

/** Mongo expression truthiness: only false, null, undefined and 0 are falsey. */
function exprTruthy(v: unknown): boolean {
  return v !== false && v !== null && v !== undefined && v !== 0;
}

/**
 * Evaluates the expression set an aggregate `$project` or `$addFields` may carry.
 * Anything outside it THROWS rather than yielding undefined — a field that is
 * silently absent reads as "no value", which is how the `$arrayElemAt` fields
 * disappeared from the permissions response without anyone noticing.
 */
function evalAggExpr(expr: unknown, doc: Doc, vars: Record<string, unknown> = {}): unknown {
  if (expr && typeof expr === 'object' && !Array.isArray(expr)) {
    const [op, arg] = Object.entries(expr as Record<string, unknown>)[0] ?? [];
    if (op === '$arrayElemAt' && Array.isArray(arg)) {
      const [src, idx] = arg as [unknown, number];
      const arr = evalAggExpr(src, doc, vars);
      if (!Array.isArray(arr)) {
        return undefined;
      }
      return idx < 0 ? arr[arr.length + idx] : arr[idx];
    }
    if (op === '$filter') {
      const { input, as, cond } = (arg ?? {}) as { input: unknown; as?: string; cond: unknown };
      const arr = evalAggExpr(input, doc, vars);
      if (!Array.isArray(arr)) {
        return [];
      }
      // Mongo defaults the binding to `this` when `as` is omitted.
      const name = as ?? 'this';
      return arr.filter((el) => exprTruthy(evalAggExpr(cond, doc, { ...vars, [name]: el })));
    }
    if (op === '$and' && Array.isArray(arg)) {
      return arg.every((e) => exprTruthy(evalAggExpr(e, doc, vars)));
    }
    if (op === '$eq' && Array.isArray(arg)) {
      const [a, b] = arg as [unknown, unknown];
      // Compare through coerceId so an ObjectId and its hex string are the same
      // value — otherwise two references to one document read as different.
      return coerceId(evalAggExpr(a, doc, vars)) === coerceId(evalAggExpr(b, doc, vars));
    }
    throw new Error(
      `aggregate: unsupported expression ${op}. Supported: $arrayElemAt $filter ` +
        `$and $eq, plus $field and $$variable references. An unsupported expression ` +
        `is NOT dropped — it throws, because a silently missing field reads as ` +
        `"no value" and a silently false condition reads as "no matches".`,
    );
  }
  return resolveExpr(expr, doc, vars);
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
