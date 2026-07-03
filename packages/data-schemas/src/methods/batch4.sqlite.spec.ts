/**
 * Batch 4 contract proof: File, Key, PluginAuth, Banner running the REAL
 * production methods against the SQLite document store — zero mongoose.
 *
 * MCPServer is intentionally excluded: it constructs `new mongoose.Types.ObjectId`
 * and paginates on `_id` as an ObjectId cursor — ObjectId-coupled, deferred.
 *
 * Crypto keys (CREDS_KEY/CREDS_IV) for the Key encrypt/decrypt roundtrip are set
 * by jest setupFiles (test/creds.setup.cjs) before any module loads.
 */
import { createFileMethods } from './file';
import { createKeyMethods } from './key';
import { createPluginAuthMethods } from './pluginAuth';
import { createBannerMethods } from './banner';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let handle: SqliteHandle;
let files: ReturnType<typeof createFileMethods>;
let keys: ReturnType<typeof createKeyMethods>;
let plugins: ReturnType<typeof createPluginAuthMethods>;
let banners: ReturnType<typeof createBannerMethods>;

beforeEach(() => {
  handle = createSqliteHandle(['File', 'Key', 'PluginAuth', 'Banner']);
  files = createFileMethods(handle);
  keys = createKeyMethods(handle);
  plugins = createPluginAuthMethods(handle);
  banners = createBannerMethods(handle);
});

afterEach(() => handle.close());

describe('File on SQLite (real methods)', () => {
  it('createFile upserts; findFileById reads; getFiles filters; deleteFile removes', async () => {
    await files.createFile({ file_id: 'f1', user: 'u1', filename: 'a.png', filepath: '/a', bytes: 10, type: 'image/png', context: 'message_attachment' });
    const got = (await files.findFileById('f1')) as { filename: string } | null;
    expect(got?.filename).toBe('a.png');

    await files.createFile({ file_id: 'f2', user: 'u1', filename: 'b.png', filepath: '/b', bytes: 20, type: 'image/png', context: 'message_attachment' });
    const list = (await files.getFiles({ user: 'u1' })) as unknown[];
    expect(list).toHaveLength(2);

    await files.deleteFile('f1');
    expect(await files.findFileById('f1')).toBeNull();
  });
});

describe('Key on SQLite (real methods, encrypted roundtrip)', () => {
  it('updateUserKey encrypts; getUserKey decrypts back the original', async () => {
    await keys.updateUserKey({ userId: 'u1', name: 'openAI', value: 'sk-secret' });
    const value = await keys.getUserKey({ userId: 'u1', name: 'openAI' });
    expect(value).toBe('sk-secret'); // decrypt(encrypt(x)) === x, stored in SQLite
  });

  it('getUserKeyExpiry, re-key upsert, and deleteUserKey', async () => {
    const exp = new Date(Date.now() + 3600_000);
    await keys.updateUserKey({ userId: 'u1', name: 'k', value: 'v1', expiresAt: exp });
    const e = await keys.getUserKeyExpiry({ userId: 'u1', name: 'k' });
    expect(new Date(e.expiresAt as Date).getTime()).toBe(exp.getTime());

    await keys.updateUserKey({ userId: 'u1', name: 'k', value: 'v2' }); // re-key (upsert same row)
    expect(await keys.getUserKey({ userId: 'u1', name: 'k' })).toBe('v2');

    await keys.deleteUserKey({ userId: 'u1', name: 'k' });
    await expect(keys.getUserKey({ userId: 'u1', name: 'k' })).rejects.toThrow();
  });
});

describe('PluginAuth on SQLite (real methods)', () => {
  it('updatePluginAuth upserts; findOnePluginAuth reads; deletePluginAuth removes', async () => {
    await plugins.updatePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'API_KEY', value: 'abc' });
    const found = (await plugins.findOnePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'API_KEY' })) as { value: string } | null;
    expect(found?.value).toBeTruthy();

    await plugins.deletePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'API_KEY' });
    expect(await plugins.findOnePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'API_KEY' })).toBeNull();
  });

  it('deleteAllUserPluginAuths clears all of a user', async () => {
    await plugins.updatePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'A', value: '1' });
    await plugins.updatePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'B', value: '2' });
    await plugins.deleteAllUserPluginAuths('u1');
    expect(await plugins.findOnePluginAuth({ userId: 'u1', pluginKey: 'web', authField: 'A' })).toBeNull();
  });
});

describe('Banner on SQLite (real methods)', () => {
  it('getBanner returns the active public banner (date window + type filter)', async () => {
    const now = Date.now();
    await handle.models.Banner.create({
      bannerId: 'b1',
      message: 'hi',
      displayFrom: new Date(now - 3600_000),
      displayTo: new Date(now + 3600_000),
      type: 'banner',
      isPublic: true,
    });
    const b = (await banners.getBanner(null)) as { bannerId: string } | null;
    expect(b?.bannerId).toBe('b1');
  });

  it('getBanner returns null for an expired banner', async () => {
    const now = Date.now();
    await handle.models.Banner.create({
      bannerId: 'old',
      message: 'gone',
      displayFrom: new Date(now - 7200_000),
      displayTo: new Date(now - 3600_000),
      type: 'banner',
      isPublic: true,
    });
    expect(await banners.getBanner(null)).toBeNull();
  });
});
