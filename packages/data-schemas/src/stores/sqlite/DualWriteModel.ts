/**
 * DualWriteModel — the Phase-1 primitive of the off-Mongo cutover (#50).
 *
 * Wraps a PRIMARY model and a MIRROR model so that:
 *   - every READ (and every non-write member: `.schema`, `.collection`,
 *     `.modelName`, statics, query builders) is served by the PRIMARY, byte-for
 *     -byte as before — the served store is unchanged;
 *   - every WRITE lands in BOTH stores, mirrored by the PRIMARY's `_id`.
 *
 * It is a `Proxy` over the primary (not a hand-rolled subset) precisely so the
 * primary's full Model surface is preserved: only the ~10 write methods are
 * intercepted; everything else forwards untouched. Reads therefore keep their
 * exact chainable/thenable return types (mongoose `Query` or the SQLite
 * `QueryBuilder`), which is why no caller that chains `.sort().lean()…` breaks.
 *
 * ORTHOGONAL to which store is primary. `CHAT_STORE_SQLITE` picks the primary;
 * `CHAT_STORE_DUALWRITE` picks which domains mirror. So the same wrapper serves
 * both cutover directions:
 *   - mongoose-primary + sqlite-mirror  → Phase-1 warm-up (Mongo authoritative);
 *   - sqlite-primary   + mongoose-mirror → post-flip soak (instant rollback).
 *
 * MIRROR IS BEST-EFFORT. The primary write is authoritative and is awaited
 * first; a mirror failure is logged (never silent) and swallowed so it can
 * never break the served store. The Phase-2 `_id`-keyed backfill is the
 * convergence guarantee — the live mirror only needs to stay warm. Mirroring by
 * the primary's `_id` (as a 24-hex string that BOTH stores accept) is what makes
 * that backfill a clean upsert instead of a duplicate-producing by-value merge.
 */
import logger from '~/config/winston';

/** The subset of the Model API the chat data layer writes through. */
interface WritableModel {
  create(input: unknown): Promise<unknown>;
  insertMany(docs: unknown[]): Promise<unknown[]>;
  updateOne(filter: unknown, update: unknown, options?: Record<string, unknown>): Promise<UpdateResult>;
  updateMany(filter: unknown, update: unknown, options?: Record<string, unknown>): Promise<UpdateResult>;
  deleteOne(filter?: unknown): Promise<unknown>;
  deleteMany(filter?: unknown): Promise<unknown>;
  findOne(filter?: unknown, projection?: unknown): { select(p: unknown): { lean(): Promise<unknown> } };
  findOneAndUpdate(filter: unknown, update: unknown, options?: Record<string, unknown>): Promise<unknown>;
  findByIdAndUpdate(id: unknown, update: unknown, options?: Record<string, unknown>): Promise<unknown>;
  findOneAndDelete(filter: unknown, projection?: unknown): Promise<unknown>;
  bulkWrite(ops: BulkOp[]): Promise<BulkResult>;
}

interface UpdateResult {
  upsertedId?: unknown;
  upsertedCount?: number;
}
interface BulkResult {
  insertedIds?: Record<number, unknown>;
  upsertedIds?: Record<number, unknown>;
}
type BulkOp = Record<string, { document?: unknown; update?: unknown; upsert?: boolean }>;

const WRITE_METHODS = new Set([
  'create',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'findOneAndDelete',
  'bulkWrite',
]);

/** BSON ObjectId / DocModel id / hex string → the shared 24-hex string form. */
function idToHex(id: unknown): unknown {
  if (id == null) {
    return id;
  }
  if (typeof id === 'string') {
    return id;
  }
  const o = id as { toHexString?: () => string };
  return typeof o.toHexString === 'function' ? o.toHexString() : String(id);
}

/** A mongoose Document or a hydrated DocModel doc → a plain object. */
function toPlain(doc: unknown): Record<string, unknown> {
  const d = doc as { toObject?: () => Record<string, unknown> };
  return typeof d?.toObject === 'function' ? d.toObject() : (doc as Record<string, unknown>);
}

/** Plain copy of a written doc with `_id` normalized to the shared hex form. */
function withHexId(doc: unknown): Record<string, unknown> {
  const plain = { ...toPlain(doc) };
  if (plain._id != null) {
    plain._id = idToHex(plain._id);
  }
  return plain;
}

/**
 * Force a mirror insert (upsert path) to reuse the primary's `_id`. Operator
 * updates get `$setOnInsert._id`; replacement docs get a top-level `_id`.
 */
function withInsertId(update: unknown, id: unknown): unknown {
  if (id == null || update == null || typeof update !== 'object') {
    return update;
  }
  const u = update as Record<string, unknown>;
  const isOperatorStyle = Object.keys(u).some((k) => k.startsWith('$'));
  if (isOperatorStyle) {
    return { ...u, $setOnInsert: { ...(u.$setOnInsert as object | undefined), _id: id } };
  }
  return { ...u, _id: id };
}

/** Rebuild bulk ops so mirror inserts/upserts reuse the primary's ids. */
function alignBulkIds(ops: BulkOp[], res: BulkResult): BulkOp[] {
  const inserted = res?.insertedIds ?? {};
  const upserted = res?.upsertedIds ?? {};
  return ops.map((op, i) => {
    if (op.insertOne) {
      const document = withHexId(op.insertOne.document);
      const id = inserted[i];
      if (id != null) {
        document._id = idToHex(id);
      }
      return { insertOne: { document } };
    }
    if (op.updateOne) {
      const uid = upserted[i];
      if (uid != null && op.updateOne.upsert) {
        return { updateOne: { ...op.updateOne, update: withInsertId(op.updateOne.update, idToHex(uid)), upsert: true } };
      }
      // Never let the mirror upsert a divergent `_id` on its own.
      return { updateOne: { ...op.updateOne, upsert: false } };
    }
    return op; // updateMany / deleteOne / deleteMany replay verbatim
  });
}

/**
 * Build a dual-write Proxy over `primary`, mirroring writes to `mirror`.
 * `name` is the collection name, used only for structured mirror-error logs.
 */
export function createDualWriteModel(name: string, primary: unknown, mirror: unknown): unknown {
  const p = primary as WritableModel;
  const m = mirror as WritableModel;

  const mirrorSafe = async (op: string, fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      logger.error(
        `[dualwrite:${name}] mirror ${op} failed; primary write succeeded and remains authoritative`,
        err,
      );
    }
  };

  const handlers: Record<string, (...args: never[]) => Promise<unknown>> = {
    create: (async (input: unknown) => {
      const res = await p.create(input);
      await mirrorSafe('create', () =>
        Array.isArray(res) ? m.insertMany(res.map(withHexId)) : m.create(withHexId(res)),
      );
      return res;
    }) as never,

    insertMany: (async (docs: unknown[]) => {
      const res = await p.insertMany(docs);
      await mirrorSafe('insertMany', () => m.insertMany((res as unknown[]).map(withHexId)));
      return res;
    }) as never,

    updateOne: (async (filter: unknown, update: unknown, options: Record<string, unknown> = {}) => {
      const res = await p.updateOne(filter, update, options);
      await mirrorSafe('updateOne', () =>
        res && (res.upsertedId != null || res.upsertedCount)
          ? m.updateOne(filter, withInsertId(update, idToHex(res.upsertedId)), { ...options, upsert: true })
          : m.updateOne(filter, update, { ...options, upsert: false }),
      );
      return res;
    }) as never,

    updateMany: (async (filter: unknown, update: unknown, options: Record<string, unknown> = {}) => {
      const res = await p.updateMany(filter, update, options);
      await mirrorSafe('updateMany', () => m.updateMany(filter, update, { ...options, upsert: false }));
      return res;
    }) as never,

    deleteOne: (async (filter: unknown = {}) => {
      const res = await p.deleteOne(filter);
      await mirrorSafe('deleteOne', () => m.deleteOne(filter));
      return res;
    }) as never,

    deleteMany: (async (filter: unknown = {}) => {
      const res = await p.deleteMany(filter);
      await mirrorSafe('deleteMany', () => m.deleteMany(filter));
      return res;
    }) as never,

    findOneAndUpdate: (async (filter: unknown, update: unknown, options: Record<string, unknown> = {}) => {
      const res = await p.findOneAndUpdate(filter, update, options);
      await mirrorSafe('findOneAndUpdate', async () => {
        let mUpdate = update;
        if (options.upsert) {
          let id = (res as { _id?: unknown } | null)?._id ?? null;
          if (id == null) {
            const found = (await p.findOne(filter).select('_id').lean()) as { _id?: unknown } | null;
            id = found?._id ?? null;
          }
          if (id != null) {
            mUpdate = withInsertId(update, idToHex(id));
          }
        }
        return m.findOneAndUpdate(filter, mUpdate, {
          upsert: !!options.upsert,
          timestamps: options.timestamps,
        });
      });
      return res;
    }) as never,

    findByIdAndUpdate: (async (id: unknown, update: unknown, options: Record<string, unknown> = {}) => {
      const res = await p.findByIdAndUpdate(id, update, options);
      await mirrorSafe('findByIdAndUpdate', () =>
        m.findByIdAndUpdate(id, options.upsert ? withInsertId(update, idToHex(id)) : update, {
          upsert: !!options.upsert,
          timestamps: options.timestamps,
        }),
      );
      return res;
    }) as never,

    findOneAndDelete: (async (filter: unknown, projection?: unknown) => {
      const res = await p.findOneAndDelete(filter, projection);
      await mirrorSafe('findOneAndDelete', () => {
        const id = (res as { _id?: unknown } | null)?._id;
        return id != null ? m.deleteOne({ _id: idToHex(id) }) : m.deleteOne(filter);
      });
      return res;
    }) as never,

    bulkWrite: (async (ops: BulkOp[]) => {
      const res = await p.bulkWrite(ops);
      await mirrorSafe('bulkWrite', () => m.bulkWrite(alignBulkIds(ops, res)));
      return res;
    }) as never,
  };

  return new Proxy(primary as object, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && WRITE_METHODS.has(prop)) {
        return handlers[prop];
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
