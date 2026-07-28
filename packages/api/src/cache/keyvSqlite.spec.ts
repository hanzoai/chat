import fs from 'fs';
import os from 'os';
import path from 'path';
import { Keyv } from 'keyv';
import { closeSharedDatabase } from '@hanzochat/data-schemas';
import { KeyvSqlite } from './keyvSqlite';
import { durableCache } from './cacheFactory';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('KeyvSqlite', () => {
  afterEach(() => {
    closeSharedDatabase();
    delete process.env.CHAT_SQLITE_PATH;
  });

  it('round-trips a value through Keyv', async () => {
    const cache = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS' });

    expect(await cache.get('user123')).toBeUndefined();
    await cache.set('user123', { type: 'ban', violation_count: 3 });

    expect(await cache.get('user123')).toEqual({ type: 'ban', violation_count: 3 });
    expect(await cache.has('user123')).toBe(true);
    expect(await cache.delete('user123')).toBe(true);
    expect(await cache.get('user123')).toBeUndefined();
    expect(await cache.delete('user123')).toBe(false);
  });

  it('keeps namespaces apart in the one table', async () => {
    const bans = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS' });
    const domains = new Keyv({
      store: new KeyvSqlite('ENCODED_DOMAINS'),
      namespace: 'ENCODED_DOMAINS',
    });

    await bans.set('shared-key', 'ban');
    await domains.set('shared-key', 'domain');

    expect(await bans.get('shared-key')).toBe('ban');
    expect(await domains.get('shared-key')).toBe('domain');

    await bans.clear();

    expect(await bans.get('shared-key')).toBeUndefined();
    expect(await domains.get('shared-key')).toBe('domain');
  });

  it('expires an entry after its ttl', async () => {
    const cache = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS', ttl: 40 });

    await cache.set('user123', { expiresAt: Date.now() + 40 });
    expect(await cache.get('user123')).toBeDefined();

    await sleep(60);
    expect(await cache.get('user123')).toBeUndefined();
    // Keyv deletes on the read that finds it stale, so the row is gone too.
    expect(await new KeyvSqlite('BANS').get('BANS:user123')).toBeUndefined();
  });

  it('reads and deletes many keys', async () => {
    const cache = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS' });

    await cache.set('a', 1);
    await cache.set('c', 3);

    expect(await cache.get(['a', 'b', 'c'])).toEqual([1, undefined, 3]);
    expect(await cache.deleteMany(['a', 'c'])).toBe(true);
    expect(await cache.get(['a', 'c'])).toEqual([undefined, undefined]);
  });

  it('survives the process that wrote it — a ban outlives a restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'keyv-sqlite-'));
    process.env.CHAT_SQLITE_PATH = path.join(dir, 'chat.db');

    try {
      const before = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS' });
      await before.set('user123', { type: 'ban', expiresAt: Date.now() + 3600000 });

      // Drop every connection and open the file again, as a restart does.
      closeSharedDatabase();

      const after = new Keyv({ store: new KeyvSqlite('BANS'), namespace: 'BANS' });
      expect(await after.get('user123')).toMatchObject({ type: 'ban' });
    } finally {
      closeSharedDatabase();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * The whole point of `durableCache` is that it does NOT hand back
 * `standardCache`'s process memory. Asserting the factory is wired is not the
 * same as asserting it resolves — a fallback store that is quietly ignored
 * would pass every test above and still forget every ban on rollout.
 */
describe('durableCache', () => {
  afterEach(() => {
    closeSharedDatabase();
    delete process.env.CHAT_SQLITE_PATH;
  });

  it('lands the ban store on the SQLite file, not in process memory', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durable-cache-'));
    process.env.CHAT_SQLITE_PATH = path.join(dir, 'chat.db');

    try {
      // The two namespaces `getLogStores` and `checkBan` build.
      const banLogs = durableCache('BANS', 7200000);
      const banMemo = durableCache('ban', 0);

      const expiresAt = Date.now() + 3600000;
      await banLogs.set('user123', { type: 'ban', violation_count: 3, expiresAt });
      await banMemo.set('user123', { type: 'ban', expiresAt }, 3600000);

      // A rollout: every connection dropped, the file reopened.
      closeSharedDatabase();

      expect(await durableCache('BANS', 7200000).get('user123')).toMatchObject({
        violation_count: 3,
      });
      expect(await durableCache('ban', 0).get('user123')).toMatchObject({ type: 'ban' });
      // Namespaces do not collide even though both keys are `user123`.
      expect(await durableCache('BANS', 7200000).get('nobody')).toBeUndefined();
    } finally {
      closeSharedDatabase();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
