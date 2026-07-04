'use strict';
/*
 * BaseModel behaviour over an in-memory store (no Base/Mongo required).
 * Exercises the exact Mongoose call patterns the chat hot path relies on.
 */
const { Schema } = require('mongoose');
const { BaseModel } = require('./model');

/** In-memory backend mirroring DocumentStore's interface. */
function memStore() {
  const cols = {};
  let seq = 0;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  return {
    async ensureCollection(name) {
      cols[name] = cols[name] || new Map();
    },
    async list(name) {
      cols[name] = cols[name] || new Map();
      return [...cols[name].entries()].map(([baseId, doc]) => ({ baseId, doc: clone(doc) }));
    },
    async create(name, record) {
      cols[name] = cols[name] || new Map();
      const baseId = 'b' + ++seq;
      cols[name].set(baseId, clone(record.data));
      return { baseId, doc: clone(record.data) };
    },
    async update(name, baseId, record) {
      cols[name].set(baseId, clone(record.data));
      return { baseId, doc: clone(record.data) };
    },
    async delete(name, baseId) {
      cols[name].delete(baseId);
    },
  };
}

const convoSchema = new Schema(
  {
    conversationId: { type: String, unique: true, required: true, index: true },
    title: { type: String, default: 'New Chat', meiliIndex: true },
    user: { type: String, index: true },
    tags: { type: [String], default: [] },
    expiredAt: { type: Date },
  },
  { timestamps: true },
);
const messageSchema = new Schema(
  {
    messageId: { type: String, unique: true, required: true, index: true },
    conversationId: { type: String, index: true, required: true },
    user: { type: String, index: true, required: true, default: null },
    text: { type: String, meiliIndex: true },
  },
  { timestamps: true },
);
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'USER' },
    password: { type: String, select: false },
    totpSecret: { type: String, select: false },
  },
  { timestamps: true },
);
const balanceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tokenCredits: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  lastRefill: { type: Date, default: Date.now },
});
const sessionSchema = new Schema({
  refreshTokenHash: { type: String, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  expiration: { type: Date, required: true, index: true },
});

let store, Conversation, Message, User, Balance, Session;

beforeEach(async () => {
  store = memStore();
  Conversation = new BaseModel('Conversation', convoSchema, store);
  Message = new BaseModel('Message', messageSchema, store);
  User = new BaseModel('User', userSchema, store);
  Balance = new BaseModel('Balance', balanceSchema, store);
  Session = new BaseModel('Session', sessionSchema, store);
  for (const m of [Conversation, Message, User, Balance, Session]) await m.ensure();
});

describe('schema introspection', () => {
  test('promotes indexed/unique/timestamp fields and _id', () => {
    expect(Conversation._promotedNames.sort()).toEqual(
      ['_id', 'conversationId', 'createdAt', 'updatedAt', 'user'].sort(),
    );
  });
  test('timestamps detected only when configured', () => {
    expect(Conversation._timestamps.createdAt).toBe('createdAt');
    expect(Balance._timestamps).toBeNull();
  });
});

describe('create + defaults + ids', () => {
  test('User.create applies defaults, ObjectId _id, Date timestamps', async () => {
    const u = await User.create({ email: 'z@zoo.ngo', password: 'hashed' });
    expect(u._id).toMatch(/^[0-9a-f]{24}$/);
    expect(u.role).toBe('USER');
    expect(u.createdAt).toBeInstanceOf(Date);
  });
});

describe('login-path reads', () => {
  test('findOne + select projection + lean', async () => {
    await User.create({ email: 'z@zoo.ngo', password: 'hashed' });
    const found = await User.findOne({ email: 'z@zoo.ngo' }).select('email password').lean();
    expect(found.password).toBe('hashed');
    expect(found.role).toBeUndefined();
    expect(found._id).toBeTruthy();
  });

  test('select:false secrets (password/totpSecret) hidden by default', async () => {
    await User.create({ email: 'z@zoo.ngo', password: 'hashed', totpSecret: 'seed' });
    const def = await User.findOne({ email: 'z@zoo.ngo' }).lean();
    expect(def.password).toBeUndefined();
    expect(def.totpSecret).toBeUndefined();
    expect(def.email).toBe('z@zoo.ngo');
    // login path explicitly requests +password
    const withPw = await User.findOne({ email: 'z@zoo.ngo' }, '+password').lean();
    expect(withPw.password).toBe('hashed');
    expect(withPw.totpSecret).toBeUndefined(); // still hidden
  });
});

describe('date-equality reads (H1 — no broken date pushdown)', () => {
  test('find by an exact Date value returns the record', async () => {
    const exp = new Date('2026-07-04T12:34:56.789Z');
    await Conversation.findOneAndUpdate(
      { conversationId: 'd1', user: '507f1f77bcf86cd799439011' },
      { $set: { expiredAt: exp } },
      { upsert: true, new: true },
    );
    const byDate = await Conversation.find({ expiredAt: exp }).lean();
    expect(byDate.map((c) => c.conversationId)).toEqual(['d1']);
    const gt = await Conversation.find({ expiredAt: { $gt: new Date('2026-07-01T00:00:00Z') } }).lean();
    expect(gt.some((c) => c.conversationId === 'd1')).toBe(true);
  });
});

describe('save() preserves select:false fields after a projected load (M2)', () => {
  test('mutate a default-loaded user + save keeps password/totpSecret', async () => {
    await User.create({ email: 'z@zoo.ngo', password: 'hashed', totpSecret: 'seed' });
    const u = await User.findOne({ email: 'z@zoo.ngo' }); // default view: secrets hidden
    expect(u.password).toBeUndefined();
    u.name = 'Renamed';
    await u.save();
    const reloaded = await User.findOne({ email: 'z@zoo.ngo' }, '+password').lean();
    expect(reloaded.password).toBe('hashed'); // not erased by save()
    expect(reloaded.name).toBe('Renamed');
  });
});

describe('date hydration (non-timestamp Date fields)', () => {
  test('session.expiration and balance dates hydrate to Date', async () => {
    const exp = new Date(Date.now() + 3600_000);
    await Session.create({ user: '507f1f77bcf86cd799439011', expiration: exp });
    const s = await Session.findOne({ user: '507f1f77bcf86cd799439011' }).lean();
    expect(s.expiration).toBeInstanceOf(Date);
    expect(typeof s.expiration.getTime()).toBe('number'); // would throw on a string
    const bal = await Balance.findOneAndUpdate(
      { user: '507f1f77bcf86cd799439011' },
      { $inc: { tokenCredits: 1 } },
      { upsert: true, new: true },
    ).lean();
    expect(bal.lastRefill).toBeInstanceOf(Date);
  });
});

describe('balance upsert', () => {
  test('$inc + $set upsert then accumulate', async () => {
    const uid = '507f1f77bcf86cd799439011';
    const bal = await Balance.findOneAndUpdate(
      { user: uid },
      { $inc: { tokenCredits: 1000 } },
      { upsert: true, new: true },
    ).lean();
    expect(bal.tokenCredits).toBe(1000);
    expect(String(bal.user)).toBe(uid);
    const bal2 = await Balance.findOneAndUpdate(
      { user: uid },
      { $inc: { tokenCredits: 500 } },
      { new: true },
    ).lean();
    expect(bal2.tokenCredits).toBe(1500);
  });
});

describe('chat hot path', () => {
  const uid = '507f1f77bcf86cd799439011';

  test('saveConvo upsert + toObject', async () => {
    const c = await Conversation.findOneAndUpdate(
      { conversationId: 'c1', user: uid },
      { $set: { title: 'Hello', endpoint: 'openAI' } },
      { new: true, upsert: true },
    );
    expect(c.conversationId).toBe('c1');
    expect(c.toObject().title).toBe('Hello');
  });

  test('saveMessage upsert + partial merge, sorted read', async () => {
    const base = Date.now();
    for (let i = 0; i < 3; i++) {
      await Message.findOneAndUpdate(
        { messageId: 'm' + i, user: uid },
        { conversationId: 'c1', text: 'msg' + i, createdAt: new Date(base + i * 1000) },
        { upsert: true, new: true },
      );
    }
    await Message.findOneAndUpdate({ messageId: 'm1', user: uid }, { text: 'edited' }, { new: true });
    const msgs = await Message.find({ conversationId: 'c1', user: uid }).sort({ createdAt: 1 }).lean();
    expect(msgs.map((m) => m.messageId)).toEqual(['m0', 'm1', 'm2']);
    expect(msgs[1].text).toBe('edited');
    expect(msgs[1].conversationId).toBe('c1'); // merge preserved
  });

  test('find(A).deleteMany(B) merges conditions', async () => {
    const base = Date.now();
    for (let i = 0; i < 3; i++) {
      await Message.create({ messageId: 'm' + i, conversationId: 'c1', user: uid, createdAt: new Date(base + i * 1000) });
    }
    const res = await Message.find({ conversationId: 'c1', user: uid }).deleteMany({
      createdAt: { $gt: new Date(base + 500) },
    });
    expect(res.deletedCount).toBe(2);
    const left = await Message.find({ conversationId: 'c1' }).lean();
    expect(left).toHaveLength(1);
    expect(left[0].messageId).toBe('m0');
  });

  test('deleteMany $or/$exists', async () => {
    await Message.create({ messageId: 'mx', conversationId: '', user: uid });
    const res = await Message.deleteMany({
      $or: [{ conversationId: '' }, { conversationId: { $exists: false } }],
    });
    expect(res.deletedCount).toBe(1);
  });

  test('bulkWrite updateOne upsert', async () => {
    const res = await Conversation.bulkWrite([
      { updateOne: { filter: { conversationId: 'c1', user: uid }, update: { title: 'A' }, upsert: true } },
      { updateOne: { filter: { conversationId: 'c2', user: uid }, update: { title: 'B' }, upsert: true } },
    ]);
    expect(res.upsertedCount).toBe(2);
    expect(await Conversation.countDocuments({ conversationId: { $in: ['c1', 'c2'] } })).toBe(2);
  });

  test('meiliSearch (Base/SQLite FTS) — title + text, user-scoped', async () => {
    const other = '507f1f77bcf86cd799439099';
    await Conversation.findOneAndUpdate({ conversationId: 'c1', user: uid }, { $set: { title: 'Quantum physics notes' } }, { upsert: true, new: true });
    await Conversation.findOneAndUpdate({ conversationId: 'c2', user: uid }, { $set: { title: 'Grocery list' } }, { upsert: true, new: true });
    await Conversation.findOneAndUpdate({ conversationId: 'c3', user: other }, { $set: { title: 'Quantum leaps' } }, { upsert: true, new: true });

    const conv = await Conversation.meiliSearch('quantum', { filter: `user = "${uid}"` });
    expect(conv.hits.map((h) => h.conversationId)).toEqual(['c1']); // case-insensitive, user-scoped

    await Message.create({ messageId: 'm1', conversationId: 'c1', user: uid, text: 'the WAVEFUNCTION collapses' });
    await Message.create({ messageId: 'm2', conversationId: 'c1', user: uid, text: 'unrelated chatter' });
    const msg = await Message.meiliSearch('wavefunction', { filter: `user = "${uid}"` });
    expect(msg.hits.map((h) => h.messageId)).toEqual(['m1']);

    expect((await Conversation.meiliSearch('', { filter: `user = "${uid}"` })).hits).toEqual([]);
  });

  test('findOneAndUpdate new:false returns pre-update doc', async () => {
    await Conversation.findOneAndUpdate({ conversationId: 'c1', user: uid }, { title: 'first' }, { upsert: true, new: true });
    const before = await Conversation.findOneAndUpdate(
      { conversationId: 'c1', user: uid },
      { title: 'second' },
      { new: false },
    );
    expect(before.title).toBe('first');
    const now = await Conversation.findOne({ conversationId: 'c1' }).lean();
    expect(now.title).toBe('second');
  });
});
