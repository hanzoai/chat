/**
 * Store-harness proof for MeiliSearch driven off the SQLite store (P1 item 2).
 *
 * A fake MeiliSearch client (per-index doc maps) is injected so we assert the
 * DATA FLOW without a Meili server:
 *   - a store write (create/update/delete) drives index add-or-replace / delete,
 *     indexing the SAME fields the mongoose plugin did (incl. content → text);
 *   - `model.meiliSearch(q, params, populate)` hydrates hits FROM THE STORE;
 *   - `backfillMeili` indexes existing history.
 */
import type { MeiliSearch } from 'meilisearch';
import { attachMeili, backfillMeili } from './meili';
import { createSqliteHandle, type SqliteHandle } from './index';
import type { DocModel } from './DocModel';

jest.mock('~/config/meiliLogger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

type Row = Record<string, unknown>;

/** In-memory MeiliSearch double: one doc map per index, keyed by primaryKey. */
function makeFakeMeili() {
  const indexes = new Map<string, Map<string, Row>>();
  const store = (name: string): Map<string, Row> => {
    let s = indexes.get(name);
    if (!s) {
      s = new Map();
      indexes.set(name, s);
    }
    return s;
  };
  const client = {
    index(name: string) {
      const s = store(name);
      return {
        async getRawInfo() {
          return { uid: name };
        },
        async updateSettings() {
          return { taskUid: 1 };
        },
        async createIndex() {
          return { taskUid: 1 };
        },
        async addDocuments(docs: Row[], opts?: { primaryKey?: string }) {
          const pk = opts?.primaryKey ?? 'id';
          for (const d of docs) {
            s.set(String(d[pk]), d);
          }
          return { taskUid: 1 };
        },
        async deleteDocument(id: string) {
          s.delete(String(id));
          return { taskUid: 1 };
        },
        async search(q: string) {
          let hits = [...s.values()];
          if (q) {
            const needle = String(q).toLowerCase();
            hits = hits.filter((h) => JSON.stringify(h).toLowerCase().includes(needle));
          }
          return { hits };
        },
      };
    },
    async createIndex() {
      return { taskUid: 1 };
    },
    docs(indexName: string): Map<string, Row> {
      return store(indexName);
    },
  };
  return client;
}

describe('MeiliSearch off the SQLite store', () => {
  let handle: SqliteHandle;
  let fake: ReturnType<typeof makeFakeMeili>;
  let Conversation: DocModel;
  let Message: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['Conversation', 'Message']);
    fake = makeFakeMeili();
    Conversation = handle.models.Conversation;
    Message = handle.models.Message;
    attachMeili(handle.models, { client: fake as unknown as MeiliSearch });
  });
  afterEach(() => handle.close());

  it('indexes a conversation write with exactly the schema meiliIndex fields', async () => {
    await Conversation.create({
      conversationId: 'c1',
      user: 'u1',
      title: 'Quantum notes',
      model: 'zen',
      tags: ['physics'],
    });

    const indexed = fake.docs('convos').get('c1');
    expect(indexed).toEqual({
      conversationId: 'c1',
      user: 'u1',
      title: 'Quantum notes',
      tags: ['physics'],
    });
    // `model` is NOT a meiliIndex field — it must not leak into the index.
    expect(indexed).not.toHaveProperty('model');
  });

  it('flattens message content parts into a searchable text field', async () => {
    await Message.create({
      messageId: 'm1',
      conversationId: 'c1',
      user: 'u1',
      sender: 'User',
      isCreatedByUser: true,
      content: [{ type: 'text', text: 'hello meili' }],
    });

    const indexed = fake.docs('messages').get('m1');
    expect(indexed).toMatchObject({
      messageId: 'm1',
      conversationId: 'c1',
      user: 'u1',
      sender: 'User',
      text: 'hello meili',
    });
    expect(indexed).not.toHaveProperty('content');
  });

  it('re-indexes on update (add-or-replace) and removes on delete', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', title: 'first' });
    expect(fake.docs('convos').get('c1')).toMatchObject({ title: 'first' });

    await Conversation.updateOne({ conversationId: 'c1' }, { $set: { title: 'second' } });
    expect(fake.docs('convos').get('c1')).toMatchObject({ title: 'second' });

    await Conversation.deleteOne({ conversationId: 'c1' });
    expect(fake.docs('convos').has('c1')).toBe(false);
  });

  it('evicts a document that gains a TTL (expiredAt)', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', title: 'ephemeral' });
    expect(fake.docs('convos').has('c1')).toBe(true);

    await Conversation.updateOne(
      { conversationId: 'c1' },
      { $set: { expiredAt: new Date(Date.now() + 60000) } },
    );
    expect(fake.docs('convos').has('c1')).toBe(false);
  });

  it('meiliSearch hydrates hits from the store (populate)', async () => {
    await Conversation.create({
      conversationId: 'c1',
      user: 'u1',
      title: 'Searchable',
      model: 'zen',
      endpoint: 'Hanzo',
    });

    const result = await Conversation.meiliSearch!('Searchable', { filter: 'user = "u1"' }, true);
    expect(result.hits).toHaveLength(1);
    const hit = result.hits[0];
    // Index-derived field present…
    expect(hit).toMatchObject({ conversationId: 'c1', title: 'Searchable' });
    // …and store-only fields hydrated in (not indexed in Meili).
    expect(hit).toMatchObject({ model: 'zen', endpoint: 'Hanzo' });
  });

  it('search returns a bare hit when the store has no matching document', async () => {
    // Index a doc directly then delete it from the store only (orphan in Meili).
    fake.docs('convos').set('ghost', { conversationId: 'ghost', title: 'stale' });
    const result = await Conversation.meiliSearch!('stale', {}, true);
    expect(result.hits).toEqual([{ conversationId: 'ghost', title: 'stale' }]);
  });
});

describe('backfillMeili from the store', () => {
  let handle: SqliteHandle;
  let fake: ReturnType<typeof makeFakeMeili>;

  beforeEach(() => {
    handle = createSqliteHandle(['Conversation', 'Message']);
    fake = makeFakeMeili();
  });
  afterEach(() => handle.close());

  it('indexes existing non-expired convos and messages, skipping TTL docs', async () => {
    const Conversation = handle.models.Conversation;
    const Message = handle.models.Message;
    // Insert WITHOUT attachMeili wired, so nothing is indexed live.
    Conversation.upsertRaw({ _id: '1', conversationId: 'c1', user: 'u1', title: 'kept' });
    Conversation.upsertRaw({
      _id: '2',
      conversationId: 'c2',
      user: 'u1',
      title: 'expired',
      expiredAt: new Date(),
    });
    Message.upsertRaw({ _id: '3', messageId: 'm1', conversationId: 'c1', user: 'u1', text: 'hi' });

    const report = await backfillMeili(handle.models, {
      client: fake as unknown as MeiliSearch,
    });

    expect(report).toEqual([
      { collection: 'convos', indexed: 1 },
      { collection: 'messages', indexed: 1 },
    ]);
    expect(fake.docs('convos').has('c1')).toBe(true);
    expect(fake.docs('convos').has('c2')).toBe(false);
    expect(fake.docs('messages').has('m1')).toBe(true);
  });
});
