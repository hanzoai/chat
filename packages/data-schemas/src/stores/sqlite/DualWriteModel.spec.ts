import { createSqliteHandle, type SqliteHandle } from './index';
import { createDualWriteModel } from './DualWriteModel';
import logger from '../../config/winston';

/**
 * Exercises the dual-write wrapper with two SQLite DocModels standing in for the
 * (primary, mirror) pair — the wrapper is store-agnostic, so this fully covers
 * the mongoose-primary/SQLite-mirror production wiring: reads from primary,
 * writes to both, mirrored by the primary's `_id`, mirror failures isolated.
 */
type M = {
  create(input: unknown): Promise<{ _id: string } & Record<string, unknown>>;
  insertMany(docs: unknown[]): Promise<Array<{ _id: string }>>;
  find(filter?: unknown): { lean(): Promise<Array<Record<string, unknown>>> };
  findOne(filter?: unknown): { lean(): Promise<Record<string, unknown> | null> };
  updateOne(f: unknown, u: unknown, o?: unknown): Promise<{ upsertedId: string | null }>;
  updateMany(f: unknown, u: unknown, o?: unknown): Promise<unknown>;
  deleteOne(f: unknown): Promise<{ deletedCount: number }>;
  deleteMany(f: unknown): Promise<{ deletedCount: number }>;
  findOneAndUpdate(f: unknown, u: unknown, o?: unknown): Promise<{ _id: string } | null>;
  findByIdAndUpdate(id: unknown, u: unknown, o?: unknown): Promise<unknown>;
  findOneAndDelete(f: unknown): Promise<{ _id: string } | null>;
  bulkWrite(ops: unknown[]): Promise<{ insertedIds: Record<number, string>; upsertedIds: Record<number, string> }>;
};

describe('DualWriteModel', () => {
  let primaryH: SqliteHandle;
  let mirrorH: SqliteHandle;
  let primary: M;
  let mirror: M;
  let dw: M;

  beforeEach(() => {
    primaryH = createSqliteHandle(['Message']);
    mirrorH = createSqliteHandle(['Message']);
    primary = primaryH.models.Message as unknown as M;
    mirror = mirrorH.models.Message as unknown as M;
    dw = createDualWriteModel('Message', primary, mirror) as unknown as M;
  });

  afterEach(() => {
    primaryH.close();
    mirrorH.close();
    jest.restoreAllMocks();
  });

  const idsIn = async (m: M): Promise<string[]> =>
    (await m.find({}).lean()).map((d) => String(d._id)).sort();

  it('create lands in BOTH stores with the SAME _id', async () => {
    const doc = await dw.create({ messageId: 'm1', user: 'u1', text: 'hi' });
    expect(doc._id).toBeTruthy();

    const p = await primary.findOne({ messageId: 'm1' }).lean();
    const s = await mirror.findOne({ messageId: 'm1' }).lean();
    expect(String(p?._id)).toBe(String(doc._id));
    expect(String(s?._id)).toBe(String(doc._id)); // mirrored by primary's _id
    expect(s?.text).toBe('hi');
  });

  it('reads come from the PRIMARY only', async () => {
    await dw.create({ messageId: 'm1', user: 'u1', text: 'v1' });
    // Mutate the PRIMARY directly, bypassing the wrapper.
    await primary.updateOne({ messageId: 'm1' }, { $set: { text: 'v2-primary-only' } });

    const read = await dw.findOne({ messageId: 'm1' }).lean();
    expect(read?.text).toBe('v2-primary-only'); // served from primary

    const s = await mirror.findOne({ messageId: 'm1' }).lean();
    expect(s?.text).toBe('v1'); // mirror untouched by the direct primary write
  });

  it('updateOne upsert mirrors with the primary upserted _id', async () => {
    const res = await dw.updateOne({ messageId: 'm2', user: 'u1' }, { $set: { text: 'up' } }, { upsert: true });
    expect(res.upsertedId).toBeTruthy();
    expect(await idsIn(primary)).toEqual([String(res.upsertedId)]);
    expect(await idsIn(mirror)).toEqual([String(res.upsertedId)]); // same _id, no divergence
  });

  it('updateOne (match) replays to the mirror without a stray insert', async () => {
    await dw.create({ messageId: 'm3', user: 'u1', text: 'a' });
    await dw.updateOne({ messageId: 'm3' }, { $set: { text: 'b' } });
    expect((await mirror.findOne({ messageId: 'm3' }).lean())?.text).toBe('b');
    expect(await idsIn(mirror)).toHaveLength(1);
  });

  it('findOneAndUpdate upsert aligns the mirror _id', async () => {
    const created = (await dw.findOneAndUpdate(
      { messageId: 'm4', user: 'u1' },
      { $set: { text: 'x' } },
      { upsert: true, new: true },
    )) as { _id: string };
    expect(await idsIn(primary)).toEqual([String(created._id)]);
    expect(await idsIn(mirror)).toEqual([String(created._id)]);
  });

  it('deleteOne / deleteMany replay to the mirror', async () => {
    await dw.create({ messageId: 'm5', user: 'u1' });
    await dw.create({ messageId: 'm6', user: 'u1' });
    await dw.deleteOne({ messageId: 'm5' });
    expect(await idsIn(mirror)).toHaveLength(1);
    await dw.deleteMany({ user: 'u1' });
    expect(await idsIn(primary)).toHaveLength(0);
    expect(await idsIn(mirror)).toHaveLength(0);
  });

  it('findOneAndDelete removes from both', async () => {
    await dw.create({ messageId: 'm7', user: 'u1' });
    const removed = await dw.findOneAndDelete({ messageId: 'm7' });
    expect(removed?._id).toBeTruthy();
    expect(await idsIn(primary)).toHaveLength(0);
    expect(await idsIn(mirror)).toHaveLength(0);
  });

  it('bulkWrite mirrors insertOne/updateOne-upsert with aligned ids', async () => {
    const res = await dw.bulkWrite([
      { insertOne: { document: { messageId: 'b1', user: 'u1' } } },
      { updateOne: { filter: { messageId: 'b2', user: 'u1' }, update: { $set: { text: 't' } }, upsert: true } },
    ]);
    const insertedId = String(res.insertedIds[0]);
    const upsertedId = String(res.upsertedIds[1]);
    expect(await idsIn(primary)).toEqual([insertedId, upsertedId].sort());
    expect(await idsIn(mirror)).toEqual([insertedId, upsertedId].sort()); // same ids in both
  });

  it('isolates mirror failure: primary write succeeds and is returned, error is logged', async () => {
    const errSpy = jest.spyOn(logger, 'error').mockImplementation((() => logger) as never);
    const brokenMirror = { create: () => Promise.reject(new Error('mirror down')) } as unknown as M;
    const dwBroken = createDualWriteModel('Message', primary, brokenMirror) as unknown as M;

    const doc = await dwBroken.create({ messageId: 'm8', user: 'u1', text: 'survives' });
    expect(doc._id).toBeTruthy(); // no throw — primary authoritative
    expect((await primary.findOne({ messageId: 'm8' }).lean())?.text).toBe('survives');
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dualwrite:Message] mirror create failed'),
      expect.any(Error),
    );
  });

  it('forwards non-write members (modelName) to the primary', () => {
    expect((dw as unknown as { modelName: string }).modelName).toBe('Message');
  });
});
