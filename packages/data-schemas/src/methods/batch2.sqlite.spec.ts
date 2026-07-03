/**
 * Batch 2 contract proof: Preset, ConversationTag, SharedLink running the REAL
 * production methods against the SQLite document store — zero mongoose.
 * Same createPresetMethods / createConversationTagMethods / createShareMethods
 * the app uses; only the handle is swapped.
 */
import { v4 as uuidv4 } from 'uuid';
import { createPresetMethods } from './preset';
import { createConversationTagMethods } from './conversationTag';
import { createShareMethods } from './share';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let handle: SqliteHandle;
let preset: ReturnType<typeof createPresetMethods>;
let tags: ReturnType<typeof createConversationTagMethods>;
let share: ReturnType<typeof createShareMethods>;

beforeEach(() => {
  handle = createSqliteHandle(['Preset', 'ConversationTag', 'Conversation', 'Message', 'SharedLink']);
  preset = createPresetMethods(handle);
  tags = createConversationTagMethods(handle);
  share = createShareMethods(handle);
});

afterEach(() => handle.close());

describe('Preset on SQLite (real methods)', () => {
  it('savePreset upserts; getPreset/getPresets read back sorted by order', async () => {
    await preset.savePreset('u1', { presetId: 'p1', title: 'A', order: 2, endpoint: 'openAI' });
    await preset.savePreset('u1', { presetId: 'p2', title: 'B', order: 1, endpoint: 'openAI' });

    const p1 = await preset.getPreset('u1', 'p1');
    expect((p1 as { title: string }).title).toBe('A');

    const list = (await preset.getPresets('u1')) as Array<{ presetId: string }>;
    expect(list.map((p) => p.presetId)).toEqual(['p2', 'p1']); // order 1 before 2
  });

  it('savePreset(defaultPreset:true) unsets the previous default', async () => {
    await preset.savePreset('u1', { presetId: 'p1', defaultPreset: true });
    await preset.savePreset('u1', { presetId: 'p2', defaultPreset: true });

    const p1 = (await preset.getPreset('u1', 'p1')) as { defaultPreset?: boolean };
    const p2 = (await preset.getPreset('u1', 'p2')) as { defaultPreset?: boolean };
    expect(p1.defaultPreset).toBeUndefined(); // demoted
    expect(p2.defaultPreset).toBe(true);
  });

  it('deletePresets removes', async () => {
    await preset.savePreset('u1', { presetId: 'p1' });
    await preset.deletePresets('u1', { presetId: 'p1' });
    expect(await preset.getPreset('u1', 'p1')).toBeNull();
  });
});

describe('ConversationTag on SQLite (real methods)', () => {
  it('createConversationTag assigns positions and dedupes', async () => {
    const t1 = (await tags.createConversationTag('u1', { tag: 'work' })) as { position: number };
    const t2 = (await tags.createConversationTag('u1', { tag: 'urgent' })) as { position: number };
    expect(t1.position).toBe(1);
    expect(t2.position).toBe(2);

    const dup = (await tags.createConversationTag('u1', { tag: 'work' })) as { position: number };
    expect(dup.position).toBe(1); // returned existing, no new row
    const all = await tags.getConversationTags('u1');
    expect(all).toHaveLength(2);
  });

  it('createConversationTag addToConversation $addToSet on Conversation', async () => {
    const conversationId = uuidv4();
    await handle.models.Conversation.create({ conversationId, user: 'u1', tags: [] });
    await tags.createConversationTag('u1', { tag: 'star', addToConversation: true, conversationId });
    const c = (await handle.models.Conversation.findOne({ conversationId }).lean()) as {
      tags: string[];
    };
    expect(c.tags).toContain('star');
  });

  it('updateTagsForConversation sets conversation tags and adjusts counts', async () => {
    const conversationId = uuidv4();
    await handle.models.Conversation.create({ conversationId, user: 'u1', tags: ['a'] });
    const result = await tags.updateTagsForConversation('u1', conversationId, ['a', 'b']);
    expect(result).toEqual(['a', 'b']);
    const c = (await handle.models.Conversation.findOne({ conversationId }).lean()) as {
      tags: string[];
    };
    expect(c.tags).toEqual(['a', 'b']);
  });

  it('deleteConversationTag returns the deleted tag and reindexes positions', async () => {
    await tags.createConversationTag('u1', { tag: 'first' }); // pos 1
    await tags.createConversationTag('u1', { tag: 'second' }); // pos 2
    const deleted = (await tags.deleteConversationTag('u1', 'first')) as { tag: string } | null;
    expect(deleted?.tag).toBe('first');
    const remaining = (await tags.getConversationTags('u1')) as Array<{
      tag: string;
      position: number;
    }>;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ tag: 'second', position: 1 }); // shifted down
  });
});

describe('SharedLink on SQLite (real methods, incl. cross-collection populate)', () => {
  async function seedConversation(user = 'u1') {
    const conversationId = uuidv4();
    await handle.models.Conversation.create({ conversationId, user, title: 'Shared Chat' });
    for (let i = 0; i < 3; i++) {
      await handle.models.Message.create({
        messageId: uuidv4(),
        conversationId,
        user,
        text: `m${i}`,
        parentMessageId: i === 0 ? null : `m${i - 1}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
      });
    }
    return conversationId;
  }

  it('createSharedLink + getSharedMessages resolves messages via populate', async () => {
    const conversationId = await seedConversation();
    const { shareId } = await share.createSharedLink('u1', conversationId);
    expect(shareId).toBeTruthy();

    const shared = await share.getSharedMessages(shareId);
    expect(shared).not.toBeNull();
    expect(shared?.messages.length).toBe(3); // populate resolved the message refs
    expect(shared?.shareId).toBe(shareId);
  });

  it('getSharedLink resolves by conversation; updateSharedLink rotates shareId', async () => {
    const conversationId = await seedConversation();
    const { shareId } = await share.createSharedLink('u1', conversationId);

    const found = await share.getSharedLink('u1', conversationId);
    expect(found).toEqual({ shareId, success: true });

    const updated = await share.updateSharedLink('u1', shareId);
    expect(updated.shareId).toBeTruthy();
    expect(updated.shareId).not.toBe(shareId);
    // old shareId no longer resolves
    expect(await share.getSharedMessages(shareId)).toBeNull();
    expect(await share.getSharedMessages(updated.shareId!)).not.toBeNull();
  });

  it('getSharedLinks lists a user shares; deleteSharedLink removes', async () => {
    const conversationId = await seedConversation();
    const { shareId } = await share.createSharedLink('u1', conversationId);

    const list = await share.getSharedLinks('u1', undefined, 10, true, 'createdAt', 'desc');
    expect(list.links.some((l) => l.shareId === shareId)).toBe(true);

    await share.deleteSharedLink('u1', shareId);
    expect(await share.getSharedMessages(shareId)).toBeNull();
  });
});
