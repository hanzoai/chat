import { createSqliteHandle, type SqliteHandle } from './index';
import type { DocModel } from './DocModel';

describe('DocModel (node:sqlite backend)', () => {
  let handle: SqliteHandle;
  let Message: DocModel;
  let Conversation: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['Conversation', 'Message']);
    Conversation = handle.models.Conversation;
    Message = handle.models.Message;
  });

  afterEach(() => {
    handle.close();
  });

  it('findOneAndUpdate upserts then updates the same row', async () => {
    const created = await Message.findOneAndUpdate(
      { messageId: 'm1', user: 'u1' },
      { text: 'hi', conversationId: 'c1' },
      { upsert: true, new: true },
    );
    expect(created?.messageId).toBe('m1');
    expect(created?.text).toBe('hi');
    expect(created?._id).toBeTruthy();
    expect(created?.createdAt).toBeInstanceOf(Date);

    const updated = await Message.findOneAndUpdate(
      { messageId: 'm1', user: 'u1' },
      { text: 'edited' },
      { upsert: true, new: true },
    );
    expect(updated?._id).toBe(created?._id);
    expect(updated?.text).toBe('edited');

    expect(await Message.countDocuments({})).toBe(1);
  });

  it('enforces the unique constraint on the id field', async () => {
    await Message.create({ messageId: 'dup', user: 'u1', conversationId: 'c1' });
    await expect(Message.create({ messageId: 'dup', user: 'u2', conversationId: 'c2' })).rejects.toThrow();
  });

  it('find().select().sort().limit().lean() returns plain projected docs', async () => {
    for (let i = 0; i < 3; i++) {
      await Message.create({
        messageId: `m${i}`,
        user: 'u1',
        conversationId: 'c1',
        text: `t${i}`,
        createdAt: new Date(2026, 0, i + 1),
      });
    }
    const rows = (await Message.find({ conversationId: 'c1', user: 'u1' })
      .select('messageId text')
      .sort({ createdAt: 1 })
      .limit(2)
      .lean()) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].messageId).toBe('m0');
    expect(rows[0]).not.toHaveProperty('user'); // projected out
    expect(typeof rows[0].toObject).toBe('undefined'); // lean => plain
  });

  it('find(A).deleteMany(B) deletes intersection', async () => {
    for (let i = 0; i < 4; i++) {
      await Message.create({
        messageId: `m${i}`,
        user: 'u1',
        conversationId: 'c1',
        createdAt: new Date(2026, 0, i + 1),
      });
    }
    const anchor = await Message.findOne({ messageId: 'm1' }).lean() as { createdAt: Date };
    const res = await Message.find({ conversationId: 'c1', user: 'u1' }).deleteMany({
      createdAt: { $gt: anchor.createdAt },
    });
    expect(res.deletedCount).toBe(2); // m2, m3
    expect(await Message.countDocuments({})).toBe(2);
  });

  it('bulkWrite upserts with timestamps flag honored', async () => {
    const res = await Message.bulkWrite([
      { updateOne: { filter: { messageId: 'a' }, update: { messageId: 'a', text: 'A' }, upsert: true } },
      { updateOne: { filter: { messageId: 'b' }, update: { messageId: 'b', text: 'B' }, upsert: true } },
    ]);
    expect(res.upsertedCount).toBe(2);
    expect(await Message.countDocuments({})).toBe(2);
  });

  it('rehydrates date fields on read; expiredAt=null stays null', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', expiredAt: null });
    const c = (await Conversation.findOne({ conversationId: 'c1' }).lean()) as {
      createdAt: Date;
      updatedAt: Date;
      expiredAt: unknown;
    };
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
    expect(c.expiredAt).toBeNull();
  });

  it('range + $or filters resolve through the index anchor', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', isArchived: false });
    await Conversation.create({ conversationId: 'c2', user: 'u1', isArchived: true });
    await Conversation.create({ conversationId: 'c3', user: 'u2', isArchived: false });
    const rows = (await Conversation.find({
      $and: [{ user: 'u1' }, { $or: [{ isArchived: false }, { isArchived: { $exists: false } }] }],
    }).lean()) as unknown[];
    expect(rows).toHaveLength(1);
  });
});
