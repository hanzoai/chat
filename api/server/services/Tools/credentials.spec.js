const { AuthType } = require('@hanzochat/data-provider');

jest.mock('~/server/services/PluginService', () => ({
  getUserPluginAuthValue: jest.fn(),
}));

const { getUserPluginAuthValue } = require('~/server/services/PluginService');
const { loadAuthValues } = require('./credentials');

describe('loadAuthValues', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return env value when set to a real key', async () => {
    process.env.MY_API_KEY = 'real-key-123';

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['MY_API_KEY'],
    });

    expect(result).toEqual({ MY_API_KEY: 'real-key-123' });
  });

  it('should skip user_provided sentinel and try user DB value', async () => {
    process.env.GOOGLE_KEY = AuthType.USER_PROVIDED;
    getUserPluginAuthValue.mockResolvedValue('user-stored-key');

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['GOOGLE_KEY'],
    });

    expect(getUserPluginAuthValue).toHaveBeenCalledWith('user1', 'GOOGLE_KEY', true);
    expect(result).toEqual({ GOOGLE_KEY: 'user-stored-key' });
  });

  it('should skip user_provided and continue to next field in fallback chain', async () => {
    process.env.GOOGLE_KEY = AuthType.USER_PROVIDED;
    process.env.GOOGLE_SERVICE_KEY_FILE = '/path/to/service-account.json';
    getUserPluginAuthValue.mockRejectedValue(new Error('No auth found'));

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['GEMINI_API_KEY||GOOGLE_KEY||GOOGLE_SERVICE_KEY_FILE'],
    });

    expect(result).toEqual({ GOOGLE_SERVICE_KEY_FILE: '/path/to/service-account.json' });
  });

  it('should skip empty and whitespace-only env values', async () => {
    process.env.EMPTY_KEY = '';
    process.env.WHITESPACE_KEY = '   ';
    process.env.REAL_KEY = 'valid';

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['EMPTY_KEY||WHITESPACE_KEY||REAL_KEY'],
    });

    expect(result).toEqual({ REAL_KEY: 'valid' });
  });

  it('should not return user_provided as an auth value', async () => {
    process.env.GOOGLE_KEY = AuthType.USER_PROVIDED;
    getUserPluginAuthValue.mockResolvedValue(null);

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['GOOGLE_KEY'],
      throwError: false,
    });

    expect(result).toEqual({});
  });

  it('should return env value without calling DB when env is valid', async () => {
    process.env.MY_KEY = 'valid-key';

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['MY_KEY'],
    });

    expect(result).toEqual({ MY_KEY: 'valid-key' });
    expect(getUserPluginAuthValue).not.toHaveBeenCalled();
  });

  it('should return real env value from first matching field in fallback chain', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.GOOGLE_KEY = 'google-key';

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['GEMINI_API_KEY||GOOGLE_KEY'],
    });

    expect(result).toEqual({ GEMINI_API_KEY: 'gemini-key' });
  });

  it('should return undefined for optional field when sentinel is filtered and DB throws', async () => {
    process.env.GOOGLE_KEY = AuthType.USER_PROVIDED;
    getUserPluginAuthValue.mockRejectedValue(new Error('No auth found'));

    const optional = new Set(['GOOGLE_KEY']);
    const result = await loadAuthValues({
      userId: 'user1',
      authFields: ['GOOGLE_KEY'],
      optional,
    });

    expect(result).toEqual({ GOOGLE_KEY: undefined });
  });

  it('should not leak sentinel through catch path when DB lookup throws', async () => {
    process.env.GOOGLE_KEY = AuthType.USER_PROVIDED;
    getUserPluginAuthValue.mockRejectedValue(new Error('No auth found'));

    await expect(
      loadAuthValues({
        userId: 'user1',
        authFields: ['GOOGLE_KEY'],
      }),
    ).rejects.toThrow('No auth found');
  });
});

/**
 * The `EnvVar.CODE_API_KEY` gap, pinned.
 *
 * `@hanzochat/agents@3.2.63` does not export CODE_API_KEY, so five call sites pass
 * `[undefined]` here and this threw `Cannot read properties of undefined (reading
 * 'split')` on every /v1/chat/agents/tools/execute_code/auth. The throw was caught
 * and answered 200 {authenticated:false} — right answer, ERROR-level log, on every
 * page load. Real errors get buried that way.
 */
describe('loadAuthValues — a field that is not a string', () => {
  it('does not throw on an undefined field (the shipped EnvVar.CODE_API_KEY gap)', async () => {
    await expect(loadAuthValues({ userId: 'user1', authFields: [undefined] })).resolves.toEqual({});
  });

  it('does not throw on null or empty fields', async () => {
    await expect(loadAuthValues({ userId: 'user1', authFields: [null, ''] })).resolves.toEqual({});
  });

  it('still resolves the real fields beside an undefined one', async () => {
    process.env.REAL_KEY = 'real-value';

    const result = await loadAuthValues({
      userId: 'user1',
      authFields: [undefined, 'REAL_KEY'],
    });

    expect(result).toEqual({ REAL_KEY: 'real-value' });
  });
});
