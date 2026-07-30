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

const mockResolveTenantBearer = jest.fn();
jest.mock('@hanzochat/api', () => ({
  resolveTenantBearer: (...args) => mockResolveTenantBearer(...args),
}));

const { refreshIamBearer, currentBearer } = require('./iamBearerRefresh');

const CONFIG = { serverMetadata: () => ({}) };

function reqWith(session) {
  return { session };
}

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks does NOT drain a `mockReturnValueOnce` queue, and a leftover
  // one-shot silently answers the NEXT test — which is how a select-only
  // regression read as green here once. Reset the selector outright so each case
  // states its own selection.
  mockResolveTenantBearer.mockReset();
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

/**
 * `currentBearer` is select-then-renew, composed ONCE.
 *
 * The regression it pins is not a crash either: it is the two halves living apart.
 * `/v1/chat/ask` composed them by hand and kept answering, while the chat-completion
 * path selected only — so an hour into a valid session the refresh credential sat
 * unspent in the session and EVERY ordinary message was refused. Both surfaces now
 * go through this function, so a renewal that reaches one reaches the other.
 */
describe('currentBearer', () => {
  it('returns the selected bearer and does NOT renew when one is already current', async () => {
    mockResolveTenantBearer.mockReturnValue('current-id');
    const req = reqWith({ iamBearerRefresh: 'rt-1' });

    await expect(currentBearer(req)).resolves.toBe('current-id');
    expect(mockRefreshTokenGrant).not.toHaveBeenCalled();
  });

  it('renews a stale bearer and returns the renewed one — the completion path bug', async () => {
    // Stale on first selection, current after the renewal writes the session.
    mockResolveTenantBearer.mockReturnValueOnce(null).mockReturnValueOnce('fresh-id');
    mockRefreshTokenGrant.mockResolvedValue({ id_token: 'fresh-id' });
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: { idToken: 'stale' } });

    await expect(currentBearer(req)).resolves.toBe('fresh-id');
    expect(mockRefreshTokenGrant).toHaveBeenCalledWith(CONFIG, 'rt-1');
  });

  it('re-selects after renewal rather than trusting it, so an unforwardable token is refused', async () => {
    // The renewal succeeds, but the selector still rejects what it produced (wrong
    // principal, or already expired). That token must NOT be forwarded.
    mockResolveTenantBearer.mockReturnValue(null);
    mockRefreshTokenGrant.mockResolvedValue({ id_token: 'wrong-principal' });
    const req = reqWith({ iamBearerRefresh: 'rt-1', openidTokens: {} });

    await expect(currentBearer(req)).resolves.toBeNull();
  });

  it('is null and inert for a caller with no refresh credential (guest / local user)', async () => {
    mockResolveTenantBearer.mockReturnValue(null);

    await expect(currentBearer(reqWith({}))).resolves.toBeNull();
    expect(mockRefreshTokenGrant).not.toHaveBeenCalled();
  });
});
