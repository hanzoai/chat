const mockIsEnabled = jest.fn();
const mockGetAdminPanelUrl = jest.fn();
const mockIsAdminPanelRedirect = jest.fn();
const mockGenerateAdminExchangeCode = jest.fn();
const mockSyncUserEntraGroupMemberships = jest.fn();
const mockSetAuthTokens = jest.fn();
const mockSetOpenIDAuthTokens = jest.fn();
const mockPersistOpenIDTokensToSession = jest.fn();
const mockGetLogStores = jest.fn();
const mockCheckBan = jest.fn();
const mockGenerateToken = jest.fn();
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

jest.mock('librechat-data-provider', () => ({
  CacheKeys: { ADMIN_OAUTH_EXCHANGE: 'admin-oauth-exchange' },
}));

jest.mock('@librechat/data-schemas', () => ({
  logger: mockLogger,
  DEFAULT_SESSION_EXPIRY: 60000,
}));

jest.mock('@hanzochat/api', () => ({
  isEnabled: (...args) => mockIsEnabled(...args),
  getAdminPanelUrl: (...args) => mockGetAdminPanelUrl(...args),
  isAdminPanelRedirect: (...args) => mockIsAdminPanelRedirect(...args),
  generateAdminExchangeCode: (...args) => mockGenerateAdminExchangeCode(...args),
}));

jest.mock('~/server/services/PermissionService', () => ({
  syncUserEntraGroupMemberships: (...args) => mockSyncUserEntraGroupMemberships(...args),
}));

jest.mock('~/server/services/AuthService', () => ({
  setAuthTokens: (...args) => mockSetAuthTokens(...args),
  setOpenIDAuthTokens: (...args) => mockSetOpenIDAuthTokens(...args),
  persistOpenIDTokensToSession: (...args) => mockPersistOpenIDTokensToSession(...args),
}));

jest.mock(
  '~/cache/getLogStores',
  () =>
    (...args) =>
      mockGetLogStores(...args),
);

jest.mock('~/server/middleware', () => ({
  checkBan: (...args) => mockCheckBan(...args),
}));

jest.mock('~/models', () => ({
  generateToken: (...args) => mockGenerateToken(...args),
}));

const { createOAuthHandler } = require('./oauth');

const ORIGINAL_ENV = process.env;

function buildReq(overrides = {}) {
  return {
    user: {
      _id: 'user-123',
      email: 'admin@example.com',
      provider: 'openid',
      tokenset: { refresh_token: 'openid-refresh-token', access_token: 'openid-access-token' },
      federatedTokens: { refresh_token: 'federated-refresh-token' },
    },
    pkceChallenge: 'pkce-challenge',
    banned: false,
    ...overrides,
  };
}

function buildRes() {
  return {
    headersSent: false,
    redirect: jest.fn(),
  };
}

describe('createOAuthHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      DOMAIN_CLIENT: 'http://localhost:3080',
      DOMAIN_SERVER: 'http://localhost:3080',
      OPENID_REUSE_TOKENS: 'false',
    };
    mockIsEnabled.mockImplementation((value) => value === 'true' || value === true);
    mockGetAdminPanelUrl.mockReturnValue('http://admin.example.com');
    mockIsAdminPanelRedirect.mockReturnValue(true);
    mockGetLogStores.mockReturnValue({});
    mockCheckBan.mockResolvedValue(undefined);
    mockGenerateToken.mockResolvedValue('jwt-token');
    mockGenerateAdminExchangeCode.mockResolvedValue('exchange-code');
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('omits refresh token from admin exchange when OPENID_REUSE_TOKENS is disabled', async () => {
    const handler = createOAuthHandler('http://admin.example.com/auth/openid/callback');
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await handler(req, res, next);

    expect(mockGenerateAdminExchangeCode).toHaveBeenCalledWith(
      {},
      req.user,
      'jwt-token',
      undefined,
      'http://admin.example.com',
      'pkce-challenge',
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'http://admin.example.com/auth/openid/callback?code=exchange-code',
    );
    expect(mockSetOpenIDAuthTokens).not.toHaveBeenCalled();
    expect(mockSetAuthTokens).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('includes refresh token in admin exchange when OPENID_REUSE_TOKENS is enabled', async () => {
    process.env.OPENID_REUSE_TOKENS = 'true';
    const handler = createOAuthHandler('http://admin.example.com/auth/openid/callback');
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await handler(req, res, next);

    expect(mockGenerateAdminExchangeCode).toHaveBeenCalledWith(
      {},
      req.user,
      'jwt-token',
      'openid-refresh-token',
      'http://admin.example.com',
      'pkce-challenge',
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'http://admin.example.com/auth/openid/callback?code=exchange-code',
    );
    expect(mockSetOpenIDAuthTokens).not.toHaveBeenCalled();
    expect(mockSetAuthTokens).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // The decouple: id_token persistence for downstream on-behalf-of is split from
  // the refresh strategy. OPENID_REUSE_TOKENS still SOLELY gates the OIDC
  // refresh-grant; it no longer gates whether the id_token is persisted.
  describe('standard OpenID flow — id_token persistence decouple', () => {
    beforeEach(() => {
      /** Not an admin cross-origin redirect — exercise the cookie/session path. */
      mockIsAdminPanelRedirect.mockReturnValue(false);
    });

    it('REUSE_TOKENS=false: keeps local-JWT refresh AND persists the id_token to session', async () => {
      process.env.OPENID_REUSE_TOKENS = 'false';
      const handler = createOAuthHandler('http://localhost:3080');
      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await handler(req, res, next);

      /** Refresh stays on the local-JWT path — login/refresh cookies unchanged. */
      expect(mockSetAuthTokens).toHaveBeenCalledWith(req.user._id, res);
      /** id_token IS persisted for on-behalf-of, regardless of REUSE_TOKENS. */
      expect(mockPersistOpenIDTokensToSession).toHaveBeenCalledWith(req, req.user.tokenset);
      /** The OIDC-reuse writer (which flips refresh to the OIDC grant) is NOT used. */
      expect(mockSetOpenIDAuthTokens).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3080');
      expect(next).not.toHaveBeenCalled();
    });

    it('REUSE_TOKENS=true: uses the OIDC writer (refresh path unchanged); no separate persist call', async () => {
      process.env.OPENID_REUSE_TOKENS = 'true';
      const handler = createOAuthHandler('http://localhost:3080');
      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await handler(req, res, next);

      expect(mockSyncUserEntraGroupMemberships).toHaveBeenCalledWith(
        req.user,
        'openid-access-token',
      );
      expect(mockSetOpenIDAuthTokens).toHaveBeenCalledWith(req.user.tokenset, req, res, 'user-123');
      /** setOpenIDAuthTokens already persists the id_token; no separate call. */
      expect(mockPersistOpenIDTokensToSession).not.toHaveBeenCalled();
      expect(mockSetAuthTokens).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3080');
      expect(next).not.toHaveBeenCalled();
    });

    it('local user: setAuthTokens only, never persists an OpenID token', async () => {
      process.env.OPENID_REUSE_TOKENS = 'false';
      const handler = createOAuthHandler('http://localhost:3080');
      const req = buildReq({ user: { _id: 'local-1', provider: 'local', email: 'l@example.com' } });
      const res = buildRes();
      const next = jest.fn();

      await handler(req, res, next);

      expect(mockSetAuthTokens).toHaveBeenCalledWith('local-1', res);
      expect(mockPersistOpenIDTokensToSession).not.toHaveBeenCalled();
      expect(mockSetOpenIDAuthTokens).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3080');
    });

    it('login redirect survives a persistence failure (login is paramount)', async () => {
      process.env.OPENID_REUSE_TOKENS = 'false';
      mockPersistOpenIDTokensToSession.mockImplementation(() => {
        throw new Error('session store down');
      });
      const handler = createOAuthHandler('http://localhost:3080');
      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await handler(req, res, next);

      /** The redirect still happens; the error is swallowed (best-effort). */
      expect(mockSetAuthTokens).toHaveBeenCalledWith(req.user._id, res);
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3080');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
