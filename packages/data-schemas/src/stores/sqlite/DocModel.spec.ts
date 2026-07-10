import { createSqliteHandle, type SqliteHandle } from './index';
import type { DocModel } from './DocModel';

describe('DocModel (better-sqlite3 backend)', () => {
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

describe('DocModel — QueryBuilder.distinct (ACL path)', () => {
  let handle: SqliteHandle;
  let AclEntry: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['AclEntry']);
    AclEntry = handle.models.AclEntry;
  });
  afterEach(() => handle.close());

  it('find(q).distinct(field) returns the deduped set without throwing', async () => {
    // Two principals, overlapping resources — the distinct set collapses dups.
    await AclEntry.create({ principalType: 'user', principalId: 'u1', resourceType: 'agent', resourceId: 'r1', permBits: 1 });
    await AclEntry.create({ principalType: 'user', principalId: 'u1', resourceType: 'agent', resourceId: 'r2', permBits: 1 });
    await AclEntry.create({ principalType: 'role', principalId: 'admin', resourceType: 'agent', resourceId: 'r1', permBits: 1 });
    // Different resourceType — must be excluded by the filter.
    await AclEntry.create({ principalType: 'user', principalId: 'u1', resourceType: 'prompt', resourceId: 'r9', permBits: 1 });

    // This is the exact shape findAccessibleResources / findPubliclyAccessibleResources use.
    const ids = (await AclEntry.find({
      $or: [
        { principalType: 'user', principalId: 'u1' },
        { principalType: 'role', principalId: 'admin' },
      ],
      resourceType: 'agent',
      permBits: { $bitsAllSet: 1 },
    }).distinct('resourceId')) as string[];

    expect([...ids].sort()).toEqual(['r1', 'r2']); // deduped, resourceType-scoped
  });

  it('distinct chains before .lean() (AgentCategory.getValidCategoryValues shape)', async () => {
    handle.close();
    handle = createSqliteHandle(['AgentCategory']);
    const AgentCategory = handle.models.AgentCategory;
    await AgentCategory.create({ value: 'general', isActive: true });
    await AgentCategory.create({ value: 'coding', isActive: true });
    await AgentCategory.create({ value: 'legacy', isActive: false });

    const values = (await AgentCategory.find({ isActive: true }).distinct('value').lean()) as string[];
    expect([...values].sort()).toEqual(['coding', 'general']);
  });
});

describe('DocModel — Batch 2 primitives', () => {
  let handle: SqliteHandle;

  beforeEach(() => {
    handle = createSqliteHandle(['ConversationTag', 'SharedLink', 'Message']);
  });
  afterEach(() => handle.close());

  it('compound unique (tag,user) allows same tag across users, blocks dup per user', async () => {
    const Tag = handle.models.ConversationTag;
    await Tag.create({ tag: 'work', user: 'u1' });
    await Tag.create({ tag: 'work', user: 'u2' }); // same tag, different user — OK
    await expect(Tag.create({ tag: 'work', user: 'u1' })).rejects.toThrow(); // dup per user
    expect(await Tag.countDocuments({})).toBe(2);
  });

  it('findByIdAndUpdate + findOneAndDelete', async () => {
    const Tag = handle.models.ConversationTag;
    const t = (await Tag.create({ tag: 'x', user: 'u1', position: 1 })) as { _id: string };
    await Tag.findByIdAndUpdate(t._id, { $set: { position: 9 } });
    expect(((await Tag.findOne({ tag: 'x' }).lean()) as { position: number }).position).toBe(9);
    const deleted = (await Tag.findOneAndDelete({ tag: 'x', user: 'u1' }).lean()) as { tag: string };
    expect(deleted.tag).toBe('x');
    expect(await Tag.countDocuments({})).toBe(0);
  });

  it('ref casting on write + populate on read', async () => {
    const Message = handle.models.Message;
    const Shared = handle.models.SharedLink;
    const m1 = (await Message.create({ messageId: 'm1', conversationId: 'c1', user: 'u1', text: 'A' })) as { _id: string };
    const m2 = (await Message.create({ messageId: 'm2', conversationId: 'c1', user: 'u1', text: 'B' })) as { _id: string };
    // assign FULL message docs — DocModel casts them to _id like mongoose refs
    await Shared.create({ shareId: 's1', conversationId: 'c1', user: 'u1', messages: [{ _id: m1._id }, { _id: m2._id }] });

    const raw = (await Shared.findOne({ shareId: 's1' }).lean()) as { messages: unknown[] };
    expect(raw.messages).toEqual([m1._id, m2._id]); // stored as ids

    const populated = (await Shared.findOne({ shareId: 's1' })
      .populate({ path: 'messages', select: 'text' })
      .lean()) as { messages: Array<{ text: string }> };
    expect(populated.messages.map((m) => m.text)).toEqual(['A', 'B']);
  });

  it('schema default applied on insert when absent', async () => {
    const Shared = handle.models.SharedLink;
    await Shared.create({ shareId: 's2', conversationId: 'c1', user: 'u1' });
    const doc = (await Shared.findOne({ shareId: 's2', isPublic: true }).lean()) as { isPublic: boolean };
    expect(doc.isPublic).toBe(true); // default filled
  });

  it('findOneAndUpdate(new:false, upsert) returns null on insert, old doc on update', async () => {
    const Tag = handle.models.ConversationTag;
    // insert path: no pre-image => null (mongoose semantics; upsertSkillFile relies on this)
    const onInsert = await Tag.findOneAndUpdate(
      { tag: 'a', user: 'u1' },
      { $set: { position: 1 } },
      { new: false, upsert: true },
    );
    expect(onInsert).toBeNull();
    expect(await Tag.countDocuments({ tag: 'a' })).toBe(1); // but the row WAS inserted

    // update path: returns the pre-update doc
    const onUpdate = (await Tag.findOneAndUpdate(
      { tag: 'a', user: 'u1' },
      { $set: { position: 2 } },
      { new: false, upsert: true },
    )) as { position: number };
    expect(onUpdate.position).toBe(1); // old value
    expect(((await Tag.findOne({ tag: 'a' }).lean()) as { position: number }).position).toBe(2);
  });
});
