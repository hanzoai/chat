/**
 * The bearer renewal, pinned.
 *
 * What this protects is a specific regression: the forwarded IAM bearer had NO
 * refresh path, so an hour into a valid session `resolveTenantBearer` returned null
 * and the user was told "Your Hanzo session needs refreshing" until they reloaded.
 *
 * The dangerous failure here is not a crash. It is (a) writing
 * `openidTokens.refreshToken`, which AuthController and LogoutController own, or
 * (b) keeping a rotated-away refresh credential, which renews exactly once and then
 * fails every hour after. Both are asserted directly.
 */

const mockRefreshTokenGrant = jest.fn();
const mockGetOpenIdConfig = jest.fn();

jest.mock('openid-client', () => ({
  refreshTokenGrant: (...args) => mockRefreshTokenGrant(...args),
}));
jest.mock('~/strategies/openidStrategy', () => ({
  getOpenIdConfig: () => mockGetOpenIdConfig(),
}));
jest.mock('~/config', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { refreshIamBearer } = require('./iamBearerRefresh');

const CONFIG = { serverMetadata: () => ({}) };

function reqWith(session) {
  return { session };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOpenIdConfig.mockReturnValue(CONFIG);
});

describe('refreshIamBearer', () => {
  it('is inert with no refresh credential, and never calls IAM', async () => {
    const req = reqWith({ openidTokens: { idToken: 'stale' } });
    await expect(refreshIamBearer(req)).resolves.toBe(false);
    expect(mockRefreshTokenGrant).not.toHaveBeenCalled();
  });

  it('is inert with no session at all', async () => {
    await expect(refreshIamBearer({})).resolves.toBe(false);
    expect(mockRefreshTokenGrant).not.toHaveBeenCalled();
  });

  it('renews the bearer and reports true', async () => {
    mockRefreshTokenGrant.mockResolvedValue({ id_token: 'fresh-id', access_token: 'fresh-at' });
    const req = reqWith({
      iamBearerRefresh: 'rt-1',
      openidTokens: { idToken: 'stale-id', accessToken: 'stale-at' },
    });

    await expect(refreshIamBearer(req)).resolves.toBe(true);
    expect(mockRefreshTokenGrant).toHaveBeenCalledWith(CONFIG, 'rt-1');
    expect(req.session.openidTokens.idToken).toBe('fresh-id');
    expect(req.session.openidTokens.accessToken).toBe('fresh-at');
  });

  it('leaves the fields AuthController and LogoutController own untouched', async () => {
    mockRefreshTokenGrant.mockResolvedValue({ id_token: 'fresh-id', access_token: 'fresh-at' });
    const req = reqWith({
      iamBearerRefresh: 'rt-1',
      openidTokens: { idToken: 'old', refreshToken: 'BROWSER-SESSION-RT', expiresAt: 12345 },
    });

    await refreshIamBearer(req);

    // Writing these would change /v1/chat/auth/refresh and logout for every
    // REUSE-disabled login — the thing this design exists to avoid.
    expect(req.session.openidTokens.refreshToken).toBe('BROWSER-SESSION-RT');
    expect(req.session.openidTokens.expiresAt).toBe(12345);
  });

  it('stores a rotated refresh credential, so renewal works more than once', async () => {
    mockRefreshTokenGrant.mockResolvedValue({
      id_token: 'fresh-id',
      refresh_token: 'rt-2',
    });
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: {} });

    await refreshIamBearer(req);
    expect(req.session.iamBearerRefresh).toBe('rt-2');
  });

  it('keeps the existing credential when IAM does not rotate it', async () => {
    mockRefreshTokenGrant.mockResolvedValue({ id_token: 'fresh-id' });
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: {} });

    await refreshIamBearer(req);
    expect(req.session.iamBearerRefresh).toBe('rt-1');
  });

  it('drops the credential when IAM refuses, so it is not retried every turn', async () => {
    mockRefreshTokenGrant.mockRejectedValue(new Error('invalid_grant'));
    const req = reqWith({ iamBearerRefresh: 'revoked', openidTokens: { idToken: 'stale' } });

    await expect(refreshIamBearer(req)).resolves.toBe(false);
    expect(req.session.iamBearerRefresh).toBeUndefined();
    expect(req.session.openidTokens.idToken).toBe('stale');
  });

  it('reports false when the token endpoint returns neither token', async () => {
    mockRefreshTokenGrant.mockResolvedValue({ token_type: 'Bearer' });
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: { idToken: 'stale' } });

    await expect(refreshIamBearer(req)).resolves.toBe(false);
    expect(req.session.openidTokens.idToken).toBe('stale');
  });

  it('reports false when OpenID is not configured', async () => {
    mockGetOpenIdConfig.mockReturnValue(null);
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: {} });

    await expect(refreshIamBearer(req)).resolves.toBe(false);
    expect(mockRefreshTokenGrant).not.toHaveBeenCalled();
  });
});
