/**
 * What a user document may carry out of this process, and what records that it
 * has been greeted.
 *
 * The file this replaces was deleted in 70196c49a1 along with `AuthService`,
 * `twoFactorService` and `AuthController` — IAM owns those now, so their specs
 * went with their subjects. `UserController` did not go: it is still the
 * projection boundary for `GET /v1/chat/user`, and the `credentials` lane in
 * hanzo.yml has been naming a file that was not there ever since. Jest reads
 * those arguments as patterns, so the lane quietly ran six files while claiming
 * ten and stayed green throughout.
 */

const mockFindByIdAndUpdate = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: mockLoggerError, warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
  webSearchKeys: [],
}));
jest.mock('@hanzochat/data-provider', () => ({
  Tools: {},
  CacheKeys: {},
  Constants: {},
  FileSources: { s3: 's3' },
}));
jest.mock('@hanzochat/api', () => ({
  MCPOAuthHandler: {},
  MCPTokenStorage: {},
  normalizeHttpError: jest.fn(),
  extractWebSearchEnvVars: jest.fn(),
  resolveTenantBearer: jest.fn(),
}));
jest.mock('~/models', () => ({ updateUser: jest.fn() }), { virtual: true });
jest.mock('~/db/models', () => ({ User: { findByIdAndUpdate: mockFindByIdAndUpdate } }), {
  virtual: true,
});
jest.mock('~/server/services/PluginService', () => ({}), { virtual: true });
jest.mock('~/config', () => ({}), { virtual: true });
jest.mock('~/server/services/Config/getCachedTools', () => ({}), { virtual: true });
jest.mock('~/server/services/Files/S3/crud', () => ({ needsRefresh: () => false }), {
  virtual: true,
});
jest.mock('~/server/services/Files/process', () => ({}), { virtual: true });
jest.mock('~/server/services/Config', () => ({ getAppConfig: async () => ({}) }), { virtual: true });
jest.mock(
  '~/server/services/guestConfig',
  () => ({ buildGuestUser: () => ({ id: 'guest', guest: true }) }),
  { virtual: true },
);
jest.mock('~/server/services/iamUser', () => ({ pictureFromUserinfo: jest.fn() }), {
  virtual: true,
});
jest.mock('~/models/ToolCall', () => ({}), { virtual: true });
jest.mock('~/models/Prompt', () => ({}), { virtual: true });
jest.mock('~/models/Agent', () => ({}), { virtual: true });
jest.mock('~/cache', () => ({ getLogStores: () => ({}) }), { virtual: true });

const { getUserController, tourController } = require('./UserController');

/** The res double: records the status and the body, nothing else. */
const reply = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

/** Everything a stored user carries, including what must never leave. */
const stored = {
  _id: 'user-1',
  id: 'user-1',
  email: 'newcomer@hanzo.ai',
  name: 'Newcomer',
  role: 'USER',
  toured: false,
  refreshToken: 'REFRESH-SECRET',
  totpSecret: 'TOTP-SECRET',
  backupCodes: ['CODE-SECRET'],
  password: 'HASH',
};

beforeEach(() => jest.clearAllMocks());

describe('what a user document carries out of the process', () => {
  it('projects the credentials out of the answer', async () => {
    const res = reply();
    await getUserController({ user: { ...stored } }, res);

    const [sent] = res.send.mock.calls[0];
    for (const secret of ['refreshToken', 'totpSecret', 'backupCodes', 'password']) {
      expect(sent).not.toHaveProperty(secret);
    }
    expect(JSON.stringify(sent)).not.toContain('SECRET');
  });

  it('carries the welcome flag, which the client needs to decide', async () => {
    const res = reply();
    await getUserController({ user: { ...stored } }, res);

    expect(res.send.mock.calls[0][0]).toMatchObject({ toured: false });
  });

  it('answers a guest without reading the store', async () => {
    const res = reply();
    await getUserController({ user: { guest: true } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send.mock.calls[0][0]).toMatchObject({ guest: true });
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('recording that the welcome card was seen', () => {
  it('writes the flag for the caller and nobody else', async () => {
    mockFindByIdAndUpdate.mockResolvedValue({ _id: 'user-1', toured: true });
    const res = reply();

    await tourController({ user: { id: 'user-1' } }, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'user-1',
      { toured: true },
      { new: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ toured: true });
  });

  it('refuses a caller with no record', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const res = reply();

    await tourController({ user: { id: 'ghost' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  /**
   * A failing write answers 500 and says nothing else. Handing `error.message`
   * to the browser is how a store's internals become a response body.
   */
  it('keeps the store’s own words out of the answer', async () => {
    mockFindByIdAndUpdate.mockRejectedValue(new Error('SQLITE_BUSY: database is locked'));
    const res = reply();

    await tourController({ user: { id: 'user-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('SQLITE_BUSY');
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
