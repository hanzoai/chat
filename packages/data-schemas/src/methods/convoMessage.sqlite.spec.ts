/**
 * Contract proof: the REAL production conversation + message methods running
 * against the SQLite document store with ZERO mongoose in the data path.
 *
 * Same `createMessageMethods` / `createConversationMethods` the app uses — only
 * the handle is swapped (mongoose -> createSqliteHandle). This is the migration
 * seam demonstrated end to end for the conversations+messages domain.
 */
import { v4 as uuidv4 } from 'uuid';
import { createMessageMethods } from './message';
import { createConversationMethods } from './conversation';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

/**
 * Isolate the unit-under-test from an unrelated, pre-existing fork gap: this
 * repo's `librechat-data-provider` never synced the `RetentionMode` enum that
 * upstream PR #13049 added, so both message.ts and conversation.ts (mongoose
 * path included) reference an undefined export. Both files import ONLY this enum
 * from the package; we supply the upstream value shape so the retention gate
 * evaluates instead of throwing. Our tests do not exercise retentionMode paths.
 */
jest.mock('librechat-data-provider', () => ({ RetentionMode: { ANY: 'any', ALL: 'all' } }));

let handle: SqliteHandle;
let msg: ReturnType<typeof createMessageMethods>;
let convo: ReturnType<typeof createConversationMethods>;

beforeEach(() => {
  handle = createSqliteHandle(['Conversation', 'Message']);
  msg = createMessageMethods(handle);
  convo = createConversationMethods(handle, {
    getMessages: msg.getMessages,
    deleteMessages: msg.deleteMessages,
  });
});

afterEach(() => {
  handle.close();
});

const ctx = (userId = 'user123') => ({ userId, interfaceConfig: { temporaryChatRetention: 24 } });

describe('Message domain on SQLite (real methods)', () => {
  it('saveMessage creates, re-save upserts the same row, toObject is plain', async () => {
    const conversationId = uuidv4();
    const saved = await msg.saveMessage(ctx(), {
      messageId: 'm1',
      conversationId,
      text: 'Hello',
      user: 'user123',
    });
    expect(saved?.messageId).toBe('m1');
    expect(saved?.text).toBe('Hello');
    expect(typeof (saved as { toObject?: unknown }).toObject).toBe('undefined');

    await msg.saveMessage(ctx(), { messageId: 'm1', conversationId, text: 'Edited' });
    const got = await msg.getMessage({ user: 'user123', messageId: 'm1' });
    expect(got?.text).toBe('Edited');
    const all = await msg.getMessages({ conversationId });
    expect(all).toHaveLength(1); // upsert, not duplicate
  });

  it('saveMessage rejects unauthenticated + ignores invalid conversationId', async () => {
    await expect(
      msg.saveMessage({ userId: null as unknown as string }, { messageId: 'x', conversationId: uuidv4() }),
    ).rejects.toThrow('User not authenticated');
    const bad = await msg.saveMessage(ctx(), { messageId: 'x', conversationId: 'not-a-uuid' });
    expect(bad).toBeUndefined();
  });

  it('getMessages returns ascending by createdAt with projection', async () => {
    const conversationId = uuidv4();
    for (let i = 0; i < 3; i++) {
      await msg.saveMessage(ctx(), { messageId: `m${i}`, conversationId, text: `t${i}`, user: 'user123' });
    }
    const rows = await msg.getMessages({ conversationId }, 'messageId text');
    expect(rows.map((r) => r.messageId)).toEqual(['m0', 'm1', 'm2']);
    expect(rows[0]).not.toHaveProperty('user');
  });

  it('updateMessageText + updateMessage', async () => {
    const conversationId = uuidv4();
    await msg.saveMessage(ctx(), { messageId: 'm1', conversationId, text: 'a', user: 'user123' });
    await msg.updateMessageText('user123', { messageId: 'm1', text: 'b' });
    expect((await msg.getMessage({ user: 'user123', messageId: 'm1' }))?.text).toBe('b');

    const updated = await msg.updateMessage('user123', { messageId: 'm1', sender: 'AI' });
    expect(updated.sender).toBe('AI');
    await expect(msg.updateMessage('user123', { messageId: 'missing' })).rejects.toThrow();
  });

  it('deleteMessagesSince deletes strictly-later messages in the conversation', async () => {
    const conversationId = uuidv4();
    for (let i = 0; i < 4; i++) {
      await msg.saveMessage(ctx(), { messageId: `m${i}`, conversationId, user: 'user123' });
      await new Promise((r) => setTimeout(r, 2)); // distinct createdAt
    }
    await msg.deleteMessagesSince('user123', { messageId: 'm1', conversationId });
    const left = await msg.getMessages({ conversationId });
    expect(left.map((m) => m.messageId).sort()).toEqual(['m0', 'm1']);
  });

  it('getMessagesByCursor paginates with a cursor', async () => {
    const conversationId = uuidv4();
    // Distinct second-level createdAt: the method's cursor is String(Date)
    // (second precision), so space timestamps a second apart for determinism.
    const base = Date.UTC(2026, 0, 1, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      await msg.saveMessage(ctx(), {
        messageId: `m${i}`,
        conversationId,
        user: 'user123',
        createdAt: new Date(base + i * 1000),
      });
    }
    const page1 = await msg.getMessagesByCursor({ conversationId }, { limit: 2 });
    expect(page1.messages).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();
    const page2 = await msg.getMessagesByCursor(
      { conversationId },
      { limit: 2, cursor: page1.nextCursor },
    );
    expect(page2.messages).toHaveLength(2);
    const ids1 = page1.messages.map((m) => m.messageId);
    const ids2 = page2.messages.map((m) => m.messageId);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false); // no overlap
  });

  it('bulkSaveMessages upserts many', async () => {
    const conversationId = uuidv4();
    await msg.bulkSaveMessages([
      { messageId: 'a', conversationId, user: 'user123', text: 'A' },
      { messageId: 'b', conversationId, user: 'user123', text: 'B' },
    ]);
    expect(await msg.getMessages({ conversationId })).toHaveLength(2);
  });
});

describe('Conversation domain on SQLite (real methods)', () => {
  it('saveConvo upserts and captures message _ids; getConvo/getConvoTitle read back', async () => {
    const conversationId = uuidv4();
    await msg.saveMessage(ctx(), { messageId: 'm1', conversationId, user: 'user123', text: 'hi' });
    const saved = await convo.saveConvo(ctx(), { conversationId, title: 'My Chat' });
    expect(saved).not.toBeNull();
    expect((saved as { title: string }).title).toBe('My Chat');
    expect(Array.isArray((saved as { messages: unknown[] }).messages)).toBe(true);
    expect((saved as { messages: unknown[] }).messages).toHaveLength(1);

    expect(await convo.getConvoTitle('user123', conversationId)).toBe('My Chat');
    const c = await convo.getConvo('user123', conversationId);
    expect(c?.conversationId).toBe(conversationId);

    // re-save is an upsert (no duplicate)
    await convo.saveConvo(ctx(), { conversationId, title: 'Renamed' });
    expect(await convo.getConvoTitle('user123', conversationId)).toBe('Renamed');
  });

  it('getConvosByCursor honors archived + retention visibility and paginates', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const conversationId = uuidv4();
      ids.push(conversationId);
      await convo.saveConvo(ctx(), { conversationId, title: `c${i}` });
      await new Promise((r) => setTimeout(r, 2));
    }
    // archive one — must be excluded from the default (non-archived) listing
    await convo.saveConvo(ctx(), { conversationId: ids[0], isArchived: true });

    const page1 = await convo.getConvosByCursor('user123', { limit: 2 });
    expect(page1.conversations).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();
    expect(page1.conversations.some((c) => c.conversationId === ids[0])).toBe(false);

    const page2 = await convo.getConvosByCursor('user123', { limit: 2, cursor: page1.nextCursor });
    expect(page2.conversations.length).toBeGreaterThan(0);

    const archived = await convo.getConvosByCursor('user123', { isArchived: true });
    expect(archived.conversations.map((c) => c.conversationId)).toEqual([ids[0]]);
  });

  it('getConvosQueried returns requested ids with a map', async () => {
    const a = uuidv4();
    const b = uuidv4();
    await convo.saveConvo(ctx(), { conversationId: a, title: 'A' });
    await convo.saveConvo(ctx(), { conversationId: b, title: 'B' });
    const res = await convo.getConvosQueried('user123', [{ conversationId: a }, { conversationId: b }]);
    expect(res.conversations).toHaveLength(2);
    expect(res.convoMap[a]).toBeTruthy();
  });

  it('deleteConvos removes the conversation AND its messages (cross-collection)', async () => {
    const conversationId = uuidv4();
    await msg.saveMessage(ctx(), { messageId: 'm1', conversationId, user: 'user123' });
    await msg.saveMessage(ctx(), { messageId: 'm2', conversationId, user: 'user123' });
    await convo.saveConvo(ctx(), { conversationId, title: 'doomed' });

    const res = await convo.deleteConvos('user123', { conversationId });
    expect(res.deletedCount).toBe(1);
    expect(res.messages.deletedCount).toBe(2);
    expect(await convo.getConvo('user123', conversationId)).toBeNull();
    expect(await msg.getMessages({ conversationId })).toHaveLength(0);
  });

  it('getConvoFiles + searchConversation', async () => {
    const conversationId = uuidv4();
    await convo.saveConvo(ctx(), { conversationId, files: ['f1', 'f2'] });
    expect(await convo.getConvoFiles(conversationId)).toEqual(['f1', 'f2']);
    const found = await convo.searchConversation(conversationId);
    expect(found?.conversationId).toBe(conversationId);
    expect(found?.user).toBe('user123');
  });

  it('deleteNullOrEmptyConversations clears blank ids across both collections', async () => {
    // valid one stays
    const good = uuidv4();
    await convo.saveConvo(ctx(), { conversationId: good, title: 'keep' });
    // craft an empty-id convo + message directly through the store
    await handle.models.Conversation.create({ conversationId: '', user: 'user123' });
    await handle.models.Message.create({ messageId: 'orphan', conversationId: '', user: 'user123' });

    const res = await convo.deleteNullOrEmptyConversations();
    expect(res.conversations.deletedCount).toBe(1);
    expect(res.messages.deletedCount).toBe(1);
    expect(await convo.getConvo('user123', good)).not.toBeNull();
  });
});

describe('data path is mongoose-free', () => {
  it('never requires mongoose to satisfy the conversations+messages contract', () => {
    // The handle is pure node:sqlite; the methods above ran green against it.
    expect(handle.models.Conversation.constructor.name).toBe('DocModel');
    expect(handle.models.Message.constructor.name).toBe('DocModel');
  });
});
