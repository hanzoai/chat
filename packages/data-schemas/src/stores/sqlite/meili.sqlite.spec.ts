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

/**
 * Deletes are the hard half. An upsert can be caught at the row write, but a
 * delete has to be caught while the document still exists — and `deleteMany` is
 * a SET, so catching only the first row leaves the rest served by search after
 * the store has dropped them.
 */
describe('deleting reaches the index', () => {
  let handle: SqliteHandle;
  let fake: ReturnType<typeof makeFakeMeili>;
  let Conversation: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['Conversation', 'Message']);
    fake = makeFakeMeili();
    Conversation = handle.models.Conversation;
    attachMeili(handle.models, { client: fake as unknown as MeiliSearch });
  });
  afterEach(() => handle.close());

  it('deleteMany removes EVERY matched document, not just the first', async () => {
    for (const id of ['c1', 'c2', 'c3']) {
      await Conversation.create({ conversationId: id, user: 'u1', title: id });
    }
    await Conversation.create({ conversationId: 'keep', user: 'u2', title: 'other user' });
    expect(fake.docs('convos').size).toBe(4);

    const result = await Conversation.deleteMany({ user: 'u1' });

    expect(result.deletedCount).toBe(3);
    expect([...fake.docs('convos').keys()]).toEqual(['keep']);
  });

  it('findOneAndDelete removes the document it hands back', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', title: 'gone' });

    const removed = (await Conversation.findOneAndDelete({ conversationId: 'c1' })) as {
      title: string;
    };

    expect(removed.title).toBe('gone');
    expect(fake.docs('convos').has('c1')).toBe(false);
  });

  it('deletes under the SAME key the write indexed (a conversationId with |)', async () => {
    // Meili primary keys admit only [A-Za-z0-9_-], so this is indexed as `c--1`.
    // Deleting by the raw field would miss it and leave the entry forever.
    await Conversation.create({ conversationId: 'c|1', user: 'u1', title: 'piped' });
    expect(fake.docs('convos').has('c--1')).toBe(true);

    await Conversation.deleteOne({ conversationId: 'c|1' });

    expect(fake.docs('convos').size).toBe(0);
  });

  it('a committed bulkWrite indexes its upserts and forgets its deletes', async () => {
    await Conversation.create({ conversationId: 'c1', user: 'u1', title: 'first' });
    await Conversation.create({ conversationId: 'c2', user: 'u1', title: 'second' });

    await Conversation.bulkWrite([
      { updateOne: { filter: { conversationId: 'c1' }, update: { $set: { title: 'renamed' } } } },
      { deleteMany: { filter: { conversationId: 'c2' } } },
      {
        updateOne: {
          filter: { conversationId: 'c3' },
          update: { $set: { user: 'u1', title: 'made' } },
          upsert: true,
        },
      },
    ]);

    expect(fake.docs('convos').get('c1')).toMatchObject({ title: 'renamed' });
    expect(fake.docs('convos').has('c2')).toBe(false);
    expect(fake.docs('convos').get('c3')).toMatchObject({ title: 'made' });
  });

  it('a rolled-back bulkWrite indexes nothing', async () => {
    // The first insert succeeds; the second carries a BigInt, which no JSON
    // document can hold, so the batch throws mid-flight and rolls back. The
    // failure is deliberately a plain JS one rather than a violated SQLite
    // constraint: constraint violations intermittently fail to raise when this
    // file shares a process with DocModel.spec (a pre-existing harness defect,
    // reproducible on a clean tree with `jest --runInBand DocModel.spec
    // meili.sqlite.spec`), and this test must not inherit it. What is under test
    // is the store's own bookkeeping anyway — an index told about that first
    // write would serve a conversation the store never kept.
    await expect(
      Conversation.bulkWrite([
        { insertOne: { document: { conversationId: 'c1', user: 'u1', title: 'doomed' } } },
        { insertOne: { document: { conversationId: 'c2', user: 'u1', size: 1n } } },
      ]),
    ).rejects.toThrow();

    expect(await Conversation.countDocuments({})).toBe(0);
    expect(fake.docs('convos').size).toBe(0);
  });
});

/**
 * Search is derived; the store is the truth. Indexing runs AFTER the row is on
 * disk, so no failure of it may reach the caller.
 */
describe('MeiliSearch unreachable', () => {
  let handle: SqliteHandle;
  let Conversation: DocModel;

  /** A client whose every index request fails the way `mode` says. */
  const brokenClient = (mode: 'reject' | 'throw') => {
    const fail = () => {
      if (mode === 'throw') {
        throw new Error('meili is down');
      }
      return Promise.reject(new Error('meili is down'));
    };
    return {
      index: () => ({
        getRawInfo: fail,
        updateSettings: fail,
        addDocuments: fail,
        deleteDocument: fail,
        search: fail,
      }),
      createIndex: fail,
    };
  };

  afterEach(() => handle.close());

  it.each(['reject', 'throw'] as const)(
    'a write survives an index that %ss',
    async (mode: 'reject' | 'throw') => {
      handle = createSqliteHandle(['Conversation', 'Message']);
      Conversation = handle.models.Conversation;
      attachMeili(handle.models, { client: brokenClient(mode) as unknown as MeiliSearch });

      await expect(
        Conversation.create({ conversationId: 'c1', user: 'u1', title: 'kept' }),
      ).resolves.toMatchObject({ conversationId: 'c1' });
      await expect(
        Conversation.updateOne({ conversationId: 'c1' }, { $set: { title: 'still kept' } }),
      ).resolves.toMatchObject({ modifiedCount: 1 });
      await expect(Conversation.deleteOne({ conversationId: 'c1' })).resolves.toMatchObject({
        deletedCount: 1,
      });

      // The store is unharmed: the document was written, updated and removed.
      expect(await Conversation.countDocuments({})).toBe(0);
    },
  );
});
