import { createSqliteHandle, type SqliteHandle } from './index';
import { createDualWriteModel } from './DualWriteModel';
import { CHAT_COLLECTION_SPECS } from './collections';
import type { DocModel } from './DocModel';

/**
 * A minimal mongoose-Model stand-in for the mongo-mirror branch: it is NOT a
 * DocModel, exposes `.base.Types.ObjectId` and a native-driver-shaped
 * `.collection` with replaceOne/deleteOne, and records writes in a Map so the
 * test can assert the mirror is keyed by the primary's `_id` (as an ObjectId).
 */
class FakeObjectId {
  constructor(private readonly hex: string) {}
  toString() {
    return this.hex;
  }
  toHexString() {
    return this.hex;
  }
}
function makeFakeMongoModel() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    base: { Types: { ObjectId: FakeObjectId } },
    collection: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replaceOne: async (filter: any, doc: any) => {
        store.set(String(filter._id), doc);
        return { acknowledged: true };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deleteOne: async (filter: any) => {
        store.delete(String(filter._id));
        return { acknowledged: true };
      },
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('DualWriteModel — SQLite primary, SQLite mirror', () => {
  let primaryH: SqliteHandle;
  let mirrorH: SqliteHandle;
  let primary: DocModel;
  let mirror: DocModel;
  let dual: any;

  beforeEach(() => {
    primaryH = createSqliteHandle(['Conversation']);
    mirrorH = createSqliteHandle(['Conversation']);
    primary = primaryH.models.Conversation;
    mirror = mirrorH.models.Conversation;
    dual = createDualWriteModel(primary, mirror);
  });
  afterEach(() => {
    primaryH.close();
    mirrorH.close();
  });

  it('create mirrors the doc by the primary _id', async () => {
    const created: any = await dual.create({ conversationId: 'c1', user: 'u1', title: 'A' });
    expect(created._id).toBeTruthy();
    const inMirror = await mirror.findOne({ _id: created._id }).lean();
    expect(inMirror).toBeTruthy();
    expect((inMirror as any).conversationId).toBe('c1');
    // Same _id in both stores (mirror keyed by primary _id, not by value).
    expect(String((inMirror as any)._id)).toBe(String(created._id));
    expect(await primary.countDocuments({})).toBe(1);
    expect(await mirror.countDocuments({})).toBe(1);
  });

  it('reads pass through to primary only', async () => {
    await primary.create({ conversationId: 'only-primary', user: 'u1' });
    const viaDual = await dual.findOne({ conversationId: 'only-primary' }).lean();
    expect(viaDual).toBeTruthy();
    // mirror never saw a direct primary.create — proves reads do not touch it
    expect(await mirror.countDocuments({})).toBe(0);
  });

  it('updateOne mirrors the mutation', async () => {
    const c: any = await dual.create({ conversationId: 'c2', user: 'u1', title: 'old' });
    await dual.updateOne({ conversationId: 'c2' }, { $set: { title: 'new' } });
    const m = await mirror.findOne({ _id: c._id }).lean();
    expect((m as any).title).toBe('new');
  });

  it('findOneAndUpdate upsert mirrors the inserted doc', async () => {
    const created: any = await dual.findOneAndUpdate(
      { conversationId: 'c3', user: 'u1' },
      { $set: { title: 'up' } },
      { upsert: true, new: true },
    );
    expect(created.conversationId).toBe('c3');
    const m = await mirror.findOne({ conversationId: 'c3' }).lean();
    expect(m).toBeTruthy();
    expect(String((m as any)._id)).toBe(String(created._id));
  });

  it('deleteOne removes the doc from the mirror', async () => {
    const c: any = await dual.create({ conversationId: 'c4', user: 'u1' });
    expect(await mirror.countDocuments({})).toBe(1);
    await dual.deleteOne({ conversationId: 'c4' });
    expect(await mirror.findOne({ _id: c._id }).lean()).toBeNull();
    expect(await mirror.countDocuments({})).toBe(0);
  });

  it('bulkWrite mirrors inserts, updates and deletes', async () => {
    const seed: any = await dual.create({ conversationId: 'keep', user: 'u1', title: 't' });
    await dual.bulkWrite([
      { insertOne: { document: { conversationId: 'bulk-ins', user: 'u1' } } },
      { updateOne: { filter: { conversationId: 'keep' }, update: { $set: { title: 't2' } } } },
    ]);
    expect(await mirror.findOne({ conversationId: 'bulk-ins' }).lean()).toBeTruthy();
    const kept = await mirror.findOne({ _id: seed._id }).lean();
    expect((kept as any).title).toBe('t2');
  });

  it('idempotent: a re-mirror of the same _id does not duplicate (backfill safety)', async () => {
    const c: any = await dual.create({ conversationId: 'c5', user: 'u1' });
    // simulate the backfill upserting the same primary doc again by _id
    const raw = await primary.findById(String(c._id)).lean();
    mirror.upsertRaw(raw as any);
    mirror.upsertRaw(raw as any);
    expect(await mirror.countDocuments({ conversationId: 'c5' })).toBe(1);
  });
});

describe('DualWriteModel — SQLite primary, mongo mirror (escape-hatch direction)', () => {
  let primaryH: SqliteHandle;
  let primary: DocModel;
  let fake: ReturnType<typeof makeFakeMongoModel>;
  let dual: any;

  beforeEach(() => {
    primaryH = createSqliteHandle(['Conversation']);
    primary = primaryH.models.Conversation;
    fake = makeFakeMongoModel();
    dual = createDualWriteModel(primary, fake);
  });
  afterEach(() => primaryH.close());

  it('mirrors creates to the mongo collection keyed by an ObjectId _id', async () => {
    const created: any = await dual.create({ conversationId: 'm1', user: 'u1' });
    const hex = String(created._id);
    expect(fake.store.has(hex)).toBe(true);
    expect((fake.store.get(hex) as any)._id).toBeInstanceOf(FakeObjectId);
    expect((fake.store.get(hex) as any).conversationId).toBe('m1');
  });

  it('mirrors deletes to the mongo collection', async () => {
    const created: any = await dual.create({ conversationId: 'm2', user: 'u1' });
    const hex = String(created._id);
    expect(fake.store.has(hex)).toBe(true);
    await dual.deleteOne({ conversationId: 'm2' });
    expect(fake.store.has(hex)).toBe(false);
  });
});

describe('CHAT_COLLECTION_SPECS — all specs build a valid store', () => {
  it('opens a handle over every spec without throwing (validates the 5 new specs)', () => {
    const names = Object.keys(CHAT_COLLECTION_SPECS);
    const handle = createSqliteHandle(names);
    for (const name of names) {
      expect(handle.models[name]).toBeTruthy();
    }
    // the auth+billing batch must be present and tableable
    for (const n of ['User', 'Session', 'Token', 'Balance', 'Transaction']) {
      expect(names).toContain(n);
    }
    handle.close();
  });
});
