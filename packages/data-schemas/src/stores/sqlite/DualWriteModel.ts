/**
 * Dual-write mirror — the migration bridge between the mongoose store and the
 * SQLite document store.
 *
 * A `DualWriteModel` wraps a `primary` model (the one that SERVES reads) and a
 * `mirror` model (kept convergent for the escape hatch / the flip). Every read
 * and every non-write property falls through to `primary` unchanged; the ten
 * write methods run on `primary` first, then replicate the resulting document
 * state to `mirror` KEYED BY THE PRIMARY'S `_id` (upsert if the doc still
 * exists, delete if it was removed). Because the mirror is addressed by the
 * primary's `_id` — never by value — the live mirror and the one-shot backfill
 * write the same keyspace and converge without duplicating.
 *
 * It is symmetric, so it powers both migration directions with the same code:
 *   - pre-flip  (CHAT_STORE_DUALWRITE only):  primary = mongoose, mirror = SQLite
 *   - post-flip (CHAT_STORE_SQLITE + DUALWRITE): primary = SQLite, mirror = mongoose
 *
 * `primary` / `mirror` are each either a mongoose `Model` or a `DocModel`; both
 * expose the same bounded Model API the chat data methods use (the pure-SQLite
 * seam already proves the app runs against that subset), so the wrapper only has
 * to special-case the mirror WRITE primitives per store kind.
 */
import { DocModel } from './DocModel';
import { deepCoerceIds, type Doc, type Filter } from './engine';

/** Minimal shape the wrapper depends on — satisfied by mongoose Model and DocModel. */
interface ModelLike {
  findById(id: unknown, projection?: unknown): { select(p: string): { lean(): Promise<Doc | null> }; lean(): Promise<Doc | null> };
  findOne(filter: Filter, projection?: unknown): { select(p: string): { lean(): Promise<Doc | null> } };
  find(filter: Filter, projection?: unknown): { select(p: string): { lean(): Promise<Doc[]> } };
  create(input: unknown): Promise<unknown>;
  insertMany(docs: unknown[], options?: unknown): Promise<unknown>;
  updateOne(filter: Filter, update: unknown, options?: unknown): Promise<{ upsertedId?: unknown }>;
  updateMany(filter: Filter, update: unknown, options?: unknown): Promise<{ upsertedId?: unknown }>;
  deleteOne(filter: Filter): Promise<unknown>;
  deleteMany(filter: Filter): Promise<unknown>;
  bulkWrite(ops: Array<Record<string, unknown>>, options?: unknown): Promise<Record<string, unknown>>;
  findOneAndUpdate(filter: Filter, update: unknown, options?: unknown): unknown;
  findByIdAndUpdate(id: unknown, update: unknown, options?: unknown): unknown;
  findOneAndDelete(filter: Filter, projection?: unknown): unknown;
  [key: string]: unknown;
}

function idOf(doc: unknown): string | null {
  if (doc == null) {
    return null;
  }
  const id = (doc as Doc)._id ?? doc;
  return id == null ? null : String((id as { toString(): string }).toString());
}

/** Extracts the id list from a bulkWrite result's insertedIds/upsertedIds map. */
function idsFromResultMap(map: unknown): string[] {
  if (map == null || typeof map !== 'object') {
    return [];
  }
  return Object.values(map as Record<string, unknown>)
    .map((v) => idOf(v))
    .filter((v): v is string => v != null);
}

class DualWriteModel {
  readonly primary: ModelLike;
  private readonly mirror: ModelLike;
  private readonly mirrorIsSqlite: boolean;
  /** mongoose `Types.ObjectId` ctor, needed to key the native mongo mirror. */
  private readonly ObjectId?: new (hex: string) => unknown;

  constructor(primary: ModelLike, mirror: ModelLike) {
    this.primary = primary;
    this.mirror = mirror;
    this.mirrorIsSqlite = mirror instanceof DocModel;
    if (!this.mirrorIsSqlite) {
      // mongoose Model: `.base` is the mongoose instance carrying Types.ObjectId.
      const base = (mirror as { base?: { Types?: { ObjectId?: unknown } } }).base;
      this.ObjectId = base?.Types?.ObjectId as new (hex: string) => unknown;
    }
  }

  /* ---------------------------------------------------------- mirror sync */

  /**
   * Re-reads each id from `primary` and makes `mirror` match (upsert or delete).
   * A mirror failure is logged, never thrown: the primary (served) write already
   * succeeded, so the request must not fail because the insurance copy hiccuped.
   * Any gap is caught by the pre-flip count reconcile + the idempotent backfill.
   */
  private async syncIds(ids: Array<string | null | undefined>): Promise<void> {
    const uniq = [...new Set(ids.map((i) => (i == null ? null : String(i))))].filter(
      (i): i is string => !!i,
    );
    for (const id of uniq) {
      try {
        const doc = await this.primary.findById(id).lean();
        if (doc) {
          await this.mirrorUpsert(doc);
        } else {
          await this.mirrorDelete(id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[dual-write] mirror sync failed for _id=${id}:`, (err as Error)?.message);
      }
    }
  }

  private async mirrorUpsert(doc: Doc): Promise<void> {
    if (this.mirrorIsSqlite) {
      (this.mirror as unknown as DocModel).upsertRaw(doc);
      return;
    }
    // mongoose mirror: write verbatim through the native driver (bypasses schema
    // casting + timestamp stamping) so the copy is exact. Top-level `_id` must be
    // a real ObjectId for mongo; nested id refs stay as stored (acceptable — the
    // mongo mirror is the escape hatch, never the served store post-flip).
    const oid = this.toObjectId(doc._id);
    const raw = { ...doc, _id: oid };
    await (this.mirror as { collection: { replaceOne: Function } }).collection.replaceOne(
      { _id: oid },
      raw,
      { upsert: true },
    );
  }

  private async mirrorDelete(id: string): Promise<void> {
    if (this.mirrorIsSqlite) {
      await (this.mirror as unknown as DocModel).deleteOne({ _id: id });
      return;
    }
    await (this.mirror as { collection: { deleteOne: Function } }).collection.deleteOne({
      _id: this.toObjectId(id),
    });
  }

  private toObjectId(id: unknown): unknown {
    const hex = String((id as { toString(): string }).toString());
    if (this.ObjectId && /^[0-9a-fA-F]{24}$/.test(hex)) {
      return new this.ObjectId(hex);
    }
    return id;
  }

  /* ------------------------------------------------------------ writes */

  async create(...args: unknown[]): Promise<unknown> {
    const res = await (this.primary.create as (...a: unknown[]) => Promise<unknown>)(...args);
    const docs = Array.isArray(res) ? res : [res];
    await this.syncIds(docs.map(idOf));
    return res;
  }

  async insertMany(docs: unknown[], options?: unknown): Promise<unknown> {
    const res = await this.primary.insertMany(docs, options);
    const arr = Array.isArray(res) ? res : [res];
    await this.syncIds(arr.map(idOf));
    return res;
  }

  async updateOne(filter: Filter, update: unknown, options?: unknown): Promise<unknown> {
    const pre = await this.primary.findOne(filter).select('_id').lean();
    const res = await this.primary.updateOne(filter, update, options);
    await this.syncIds([idOf(pre), idOf(res?.upsertedId)]);
    return res;
  }

  async updateMany(filter: Filter, update: unknown, options?: unknown): Promise<unknown> {
    const pre = await this.primary.find(filter).select('_id').lean();
    const res = await this.primary.updateMany(filter, update, options);
    await this.syncIds([...pre.map(idOf), idOf(res?.upsertedId)]);
    return res;
  }

  async deleteOne(filter: Filter): Promise<unknown> {
    const pre = await this.primary.findOne(filter).select('_id').lean();
    const res = await this.primary.deleteOne(filter);
    await this.syncIds([idOf(pre)]);
    return res;
  }

  async deleteMany(filter: Filter): Promise<unknown> {
    const pre = await this.primary.find(filter).select('_id').lean();
    const res = await this.primary.deleteMany(filter);
    await this.syncIds(pre.map(idOf));
    return res;
  }

  async bulkWrite(ops: Array<Record<string, unknown>>, options?: unknown): Promise<unknown> {
    const preIds: Array<string | null> = [];
    for (const op of ops) {
      const one = (op.updateOne ?? op.deleteOne) as { filter?: Filter } | undefined;
      const many = (op.updateMany ?? op.deleteMany) as { filter?: Filter } | undefined;
      if (many?.filter) {
        const rows = await this.primary.find(many.filter).select('_id').lean();
        preIds.push(...rows.map(idOf));
      } else if (one?.filter) {
        const row = await this.primary.findOne(one.filter).select('_id').lean();
        preIds.push(idOf(row));
      }
    }
    const res = await this.primary.bulkWrite(ops, options);
    await this.syncIds([
      ...preIds,
      ...idsFromResultMap(res?.insertedIds),
      ...idsFromResultMap(res?.upsertedIds),
    ]);
    return res;
  }

  findOneAndUpdate(filter: Filter, update: unknown, options: { upsert?: boolean } = {}): DualWriteQuery {
    return new DualWriteQuery(
      this,
      () => this.primary.findOneAndUpdate(filter, update, options),
      filter,
      !!options.upsert,
    );
  }

  findByIdAndUpdate(id: unknown, update: unknown, options: { upsert?: boolean } = {}): DualWriteQuery {
    return new DualWriteQuery(
      this,
      () => this.primary.findByIdAndUpdate(id, update, options),
      { _id: id } as Filter,
      !!options.upsert,
    );
  }

  findOneAndDelete(filter: Filter, projection?: unknown): DualWriteQuery {
    return new DualWriteQuery(
      this,
      () => this.primary.findOneAndDelete(filter, projection),
      filter,
      false,
    );
  }
}

/**
 * Lazy, chainable result for the `findOneAnd*` methods. Forwards the mongoose /
 * DocModel query-builder chain (`select/lean/populate/sort/session/…`) to the
 * primary query so the caller's return shape is preserved, and mirrors the
 * affected document once the write resolves. Order matters: the pre-image id is
 * captured BEFORE the (lazy) primary query executes its write.
 */
class DualWriteQuery implements PromiseLike<unknown> {
  private pq: { [k: string]: Function } | null = null;

  constructor(
    private readonly dwm: DualWriteModel,
    private readonly makePrimaryQuery: () => unknown,
    private readonly filter: Filter,
    private readonly upsert: boolean,
  ) {}

  private query(): { [k: string]: Function } {
    if (!this.pq) {
      this.pq = this.makePrimaryQuery() as { [k: string]: Function };
    }
    return this.pq;
  }

  private chain(method: string, ...args: unknown[]): this {
    const q = this.query();
    if (typeof q[method] === 'function') {
      q[method](...args);
    }
    return this;
  }

  select(p: unknown): this {
    return this.chain('select', p);
  }
  lean(): this {
    return this.chain('lean');
  }
  populate(p: unknown): this {
    return this.chain('populate', p);
  }
  sort(p: unknown): this {
    return this.chain('sort', p);
  }
  skip(n: unknown): this {
    return this.chain('skip', n);
  }
  limit(n: unknown): this {
    return this.chain('limit', n);
  }
  session(s: unknown): this {
    return this.chain('session', s);
  }

  private async run(): Promise<unknown> {
    const primary = (this.dwm as unknown as { primary: ModelLike }).primary;
    const pre = await primary.findOne(this.filter).select('_id').lean();
    const result = await (this.query() as unknown as Promise<Doc | null>);
    const ids = [idOf(pre), idOf(result)];
    if (!pre && !result && this.upsert) {
      const seeded = await primary.findOne(this.filter).select('_id').lean();
      ids.push(idOf(seeded));
    }
    await (this.dwm as unknown as { syncIds(ids: unknown[]): Promise<void> })['syncIds'](ids);
    return result;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
  catch<T = never>(onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null): Promise<unknown> {
    return this.run().catch(onrejected);
  }
  exec(): Promise<unknown> {
    return this.run();
  }
}

/**
 * Builds a dual-write model as a Proxy: the write methods above take precedence,
 * every other access (find/findOne/aggregate/countDocuments/modelName/…) falls
 * through to `primary`, so the wrapper's surface is exactly the primary's plus
 * mirrored writes. `syncIds` is private but reached by DualWriteQuery via the
 * bracket accessor, so it must resolve on the target, not the primary.
 */
export function createDualWriteModel(primary: unknown, mirror: unknown): unknown {
  const dwm = new DualWriteModel(primary as ModelLike, mirror as ModelLike);
  return new Proxy(dwm, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      const value = (primary as Record<string | symbol, unknown>)[prop];
      return typeof value === 'function' ? (value as Function).bind(primary) : value;
    },
  });
}

export { DualWriteModel };
