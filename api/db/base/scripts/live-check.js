'use strict';
/*
 * LIVE proof: the REAL @librechat/data-schemas model+method factories, driven
 * through the Hanzo Base facade, persisting to a running Base instance.
 *
 * Exercises the login path (createUser + balance grant + findUser +
 * bcrypt.compare) and the chat hot path (saveConvo + saveMessage shapes),
 * then reads the documents straight back out of Base to prove they landed
 * there — not in MongoDB.
 *
 * Run: HANZO_BASE_URL=... HANZO_BASE_TOKEN=... node api/db/base/__tests__/live.js
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const { createModels, createMethods } = require('@librechat/data-schemas');
const { mongoose, connectDb, store } = require('..');

async function main() {
  const models = createModels(mongoose);
  const methods = createMethods(mongoose);
  await connectDb();
  console.log('[live] connected + collections provisioned');

  const ok = (m) => console.log('  ok -', m);
  const email = `z+${Date.now()}@zoo.ngo`;
  const plain = 'IloveChat2026!!';
  const password = await bcrypt.hash(plain, 10);

  // ---- LOGIN PATH ----------------------------------------------------------
  const userId = await methods.createUser(
    { email, password, name: 'Z', username: 'z', provider: 'local' },
    { enabled: true, startBalance: 100000 },
    true,
    false,
  );
  assert(userId, 'createUser returned an id');
  ok('createUser (User + Balance grant)');

  // Default read hides select:false secrets (password/totpSecret) — regression guard.
  const safeUser = await methods.findUser({ email: email.toUpperCase() }); // email normalized
  assert(safeUser && safeUser.email === email, 'findUser by (normalized) email');
  assert.strictEqual(safeUser.password, undefined, 'password NOT returned by default (select:false)');
  ok('findUser default view hides the password hash (select:false honored)');

  // Real login path selects +password explicitly (see api/strategies/localStrategy.js).
  const user = await methods.findUser({ email }, '+password');
  const match = await bcrypt.compare(plain, user.password);
  assert.strictEqual(match, true, 'bcrypt.compare succeeds — password stored hashed');
  assert.notStrictEqual(user.password, plain, 'password is NOT plaintext');
  ok('findUser(+password) + bcrypt verification (hashed, never plaintext)');

  const balance = await models.Balance.findOne({ user: user._id }).lean();
  assert.strictEqual(balance.tokenCredits, 100000, 'balance granted via $inc upsert');
  ok('Balance record created on Base with $inc grant');

  // ---- CHAT HOT PATH -------------------------------------------------------
  const uid = String(user._id);
  const convo = await models.Conversation.findOneAndUpdate(
    { conversationId: 'conv-live-1', user: uid },
    { $set: { title: 'Hello Base', endpoint: 'openAI', model: 'gpt-4o', messages: [] } },
    { new: true, upsert: true },
  );
  assert.strictEqual(convo.conversationId, 'conv-live-1');
  assert.strictEqual(convo.title, 'Hello Base');
  ok('saveConvo — conversation upserted to Base');

  const msg = await models.Message.findOneAndUpdate(
    { messageId: 'msg-live-1', user: uid },
    {
      conversationId: 'conv-live-1',
      text: 'Persisted to Hanzo Base (SQLite), not Mongo.',
      sender: 'User',
      isCreatedByUser: true,
    },
    { new: true, upsert: true },
  );
  assert.strictEqual(msg.messageId, 'msg-live-1');
  ok('saveMessage — message upserted to Base');

  const msgs = await models.Message.find({ conversationId: 'conv-live-1', user: uid })
    .sort({ createdAt: 1 })
    .lean();
  assert.strictEqual(msgs.length, 1);
  assert.ok(msgs[0].text.includes('Hanzo Base'));
  ok('getMessages — read back from Base, sorted');

  // ---- VERIFY THE BYTES ARE IN BASE (raw REST, bypassing the adapter) ------
  const raw = await store.client.send(
    `/v1/collections/message/records?filter=${encodeURIComponent(`messageId='msg-live-1' && user='${uid}'`)}`,
  );
  assert.ok(raw.items && raw.items.length === 1, 'message present in Base via raw REST');
  const storedDoc = raw.items[0].data;
  const parsed = typeof storedDoc === 'string' ? JSON.parse(storedDoc) : storedDoc;
  assert.strictEqual(parsed.messageId, 'msg-live-1', 'Base record.data holds the full document');
  assert.strictEqual(raw.items[0].conversationId, 'conv-live-1', 'promoted column mirrored for filter');
  ok('RAW Base REST confirms the document physically persisted to Base/SQLite');

  // ---- FTS (Base/SQLite search replaces MeiliSearch) -----------------------
  const convoHits = await models.Conversation.meiliSearch('hello', { filter: `user = "${uid}"` });
  assert.ok(
    convoHits.hits.some((h) => h.conversationId === 'conv-live-1'),
    'conversation search returns the matching convo by title',
  );
  ok('Conversation.meiliSearch — real title hit from Base/SQLite');

  const msgHits = await models.Message.meiliSearch('hanzo base', { filter: `user = "${uid}"` });
  assert.ok(
    msgHits.hits.some((h) => h.messageId === 'msg-live-1'),
    'message search returns the matching message by text',
  );
  assert.strictEqual(
    (await models.Conversation.meiliSearch('zzz-no-such-term', { filter: `user = "${uid}"` })).hits.length,
    0,
    'no false positives',
  );
  ok('Message.meiliSearch — real text hit from Base/SQLite (Meili dropped)');

  console.log('\nLIVE proof PASSED — login + conversation + message + SEARCH on Hanzo Base.');
  console.log(`   user collection id space, email=${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('\nLIVE proof FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
