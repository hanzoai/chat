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
 * `authFields` is now always a list of real names.
 *
 * There used to be a guard here — `typeof authField !== 'string' && continue` —
 * and a describe block pinning it, because `EnvVar.CODE_API_KEY` did not exist in
 * the shipped @hanzochat/agents and five call sites passed `[undefined]`. That
 * threw on `.split('||')`, was caught upstream, answered the correct
 * `200 {authenticated:false}`, and logged at ERROR on every page load.
 *
 * The key is gone: `execute_code` runs under the caller's own IAM bearer and
 * declares NO auth fields at all. A workaround kept past the defect it worked
 * around is just a place for the next one to hide, so both the guard and its pin
 * are deleted rather than left to assert something nothing does.
 */
describe('loadAuthValues — every caller names real fields', () => {
  it('resolves a field from the environment', async () => {
    process.env.REAL_KEY = 'real-value';
    await expect(loadAuthValues({ userId: 'user1', authFields: ['REAL_KEY'] })).resolves.toEqual({
      REAL_KEY: 'real-value',
    });
  });

  it('answers {} for a field nothing provides', async () => {
    getUserPluginAuthValue.mockResolvedValue(undefined);
    await expect(
      loadAuthValues({ userId: 'user1', authFields: ['NOT_SET_ANYWHERE'], throwError: false }),
    ).resolves.toEqual({});
  });
});
