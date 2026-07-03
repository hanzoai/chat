jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
  DEFAULT_SESSION_EXPIRY: 900000,
  DEFAULT_REFRESH_TOKEN_EXPIRY: 604800000,
}));
jest.mock('librechat-data-provider', () => ({
  ErrorTypes: {},
  SystemRoles: { USER: 'USER', ADMIN: 'ADMIN' },
  errorsToString: jest.fn(),
}));
jest.mock('@hanzochat/api', () => ({
  isEnabled: jest.fn((val) => val === 'true' || val === true),
  checkEmailConfig: jest.fn(),
  isEmailDomainAllowed: jest.fn(),
  math: jest.fn((val, fallback) => (val ? Number(val) : fallback)),
  shouldUseSecureCookie: jest.fn(() => false),
}));
jest.mock('~/models', () => ({
  findUser: jest.fn(),
  findToken: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  countUsers: jest.fn(),
  getUserById: jest.fn(),
  findSession: jest.fn(),
  createToken: jest.fn(),
  deleteTokens: jest.fn(),
  deleteSession: jest.fn(),
  createSession: jest.fn(),
  generateToken: jest.fn(),
  deleteUserById: jest.fn(),
  generateRefreshToken: jest.fn(),
}));
jest.mock('~/strategies/validators', () => ({ registerSchema: { parse: jest.fn() } }));
jest.mock('~/server/services/Config', () => ({ getAppConfig: jest.fn() }));
jest.mock('~/server/utils', () => ({ sendEmail: jest.fn() }));

const { shouldUseSecureCookie } = require('@hanzochat/api');
const { setOpenIDAuthTokens, persistOpenIDTokensToSession } = require('./AuthService');
const { logger } = require('@librechat/data-schemas');

/** Helper to build a mock Express response */
function mockResponse() {
  const cookies = {};
  const res = {
    cookie: jest.fn((name, value, options) => {
      cookies[name] = { value, options };
    }),
    _cookies: cookies,
  };
  return res;
}

/** Helper to build a mock Express request with session */
function mockRequest(sessionData = {}) {
  return {
    session: { openidTokens: null, ...sessionData },
  };
}

describe('setOpenIDAuthTokens', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      OPENID_REUSE_TOKENS: 'true',
    };
  });

  afterAll(() => {
    process.env = env;
  });

  describe('token selection (id_token vs access_token)', () => {
    it('should return id_token when both id_token and access_token are present', () => {
      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBe('the-id-token');
    });

    it('should return access_token when id_token is not available', () => {
      const tokenset = {
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBe('the-access-token');
    });

    it('should return access_token when id_token is undefined', () => {
      const tokenset = {
        id_token: undefined,
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBe('the-access-token');
    });

    it('should return access_token when id_token is null', () => {
      const tokenset = {
        id_token: null,
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBe('the-access-token');
    });

    it('should return id_token even when id_token and access_token differ', () => {
      const tokenset = {
        id_token: 'id-token-jwt-signed-by-idp',
        access_token: 'opaque-graph-api-token',
        refresh_token: 'refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBe('id-token-jwt-signed-by-idp');
      expect(result).not.toBe('opaque-graph-api-token');
    });
  });

  describe('session token storage', () => {
    it('should store the original access_token in session (not id_token)', () => {
      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      setOpenIDAuthTokens(tokenset, req, res, 'user-123');

      expect(req.session.openidTokens.accessToken).toBe('the-access-token');
      expect(req.session.openidTokens.refreshToken).toBe('the-refresh-token');
    });
  });

  describe('cookie secure flag', () => {
    it('should call shouldUseSecureCookie for every cookie set', () => {
      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      setOpenIDAuthTokens(tokenset, req, res, 'user-123');

      // token_provider + openid_user_id (session path, so no refreshToken/openid_access_token cookies)
      const secureCalls = shouldUseSecureCookie.mock.calls.length;
      expect(secureCalls).toBeGreaterThanOrEqual(2);

      // Verify all cookies use the result of shouldUseSecureCookie
      for (const [, cookie] of Object.entries(res._cookies)) {
        expect(cookie.options.secure).toBe(false);
      }
    });

    it('should set secure: true when shouldUseSecureCookie returns true', () => {
      shouldUseSecureCookie.mockReturnValue(true);

      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      setOpenIDAuthTokens(tokenset, req, res, 'user-123');

      for (const [, cookie] of Object.entries(res._cookies)) {
        expect(cookie.options.secure).toBe(true);
      }
    });

    it('should use shouldUseSecureCookie for cookie fallback path (no session)', () => {
      shouldUseSecureCookie.mockReturnValue(false);

      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
        refresh_token: 'the-refresh-token',
      };
      const req = { session: null };
      const res = mockResponse();

      setOpenIDAuthTokens(tokenset, req, res, 'user-123');

      // In the cookie fallback path, we get: refreshToken, openid_access_token, token_provider, openid_user_id
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ secure: false }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'openid_access_token',
        expect.any(String),
        expect.objectContaining({ secure: false }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'token_provider',
        'openid',
        expect.objectContaining({ secure: false }),
      );
    });
  });

  describe('edge cases', () => {
    it('should return undefined when tokenset is null', () => {
      const req = mockRequest();
      const res = mockResponse();
      const result = setOpenIDAuthTokens(null, req, res, 'user-123');
      expect(result).toBeUndefined();
    });

    it('should return undefined when access_token is missing', () => {
      const tokenset = { refresh_token: 'refresh' };
      const req = mockRequest();
      const res = mockResponse();
      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBeUndefined();
    });

    it('should return undefined when no refresh token is available', () => {
      const tokenset = { access_token: 'access', id_token: 'id' };
      const req = mockRequest();
      const res = mockResponse();
      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123');
      expect(result).toBeUndefined();
    });

    it('should use existingRefreshToken when tokenset has no refresh_token', () => {
      const tokenset = {
        id_token: 'the-id-token',
        access_token: 'the-access-token',
      };
      const req = mockRequest();
      const res = mockResponse();

      const result = setOpenIDAuthTokens(tokenset, req, res, 'user-123', 'existing-refresh');
      expect(result).toBe('the-id-token');
      expect(req.session.openidTokens.refreshToken).toBe('existing-refresh');
    });
  });
});

/**
 * The on-behalf-of session writer, decoupled from the refresh strategy. Called on
 * every OpenID login (regardless of OPENID_REUSE_TOKENS) so downstream cloud
 * calls can run as the hanzo.id principal — and ONLY ever touches server-side
 * session state, never a browser cookie.
 */
describe('persistOpenIDTokensToSession', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
    delete process.env.REFRESH_TOKEN_EXPIRY; // fall back to DEFAULT_REFRESH_TOKEN_EXPIRY
  });

  afterAll(() => {
    process.env = env;
  });

  it('stores ONLY the bearer material (no OIDC refresh credential) in the decoupled path', () => {
    // Decoupled call (no explicit refreshToken arg): the on-behalf-of bearer is
    // persisted, but the tokenset's refresh_token is NOT — the decoupled session
    // refreshes via the local JWT cookie, and leaking the OIDC refresh token into
    // the session would hijack logout's session lookup (findSession by the wrong
    // token) and leave the local session un-invalidated.
    const tokenset = {
      id_token: 'the-id-token',
      access_token: 'the-access-token',
      refresh_token: 'the-refresh-token',
    };
    const req = { session: {} };

    const before = Date.now();
    const result = persistOpenIDTokensToSession(req, tokenset);

    expect(result).toBe(true);
    expect(req.session.openidTokens).toEqual({
      accessToken: 'the-access-token',
      idToken: 'the-id-token',
      refreshToken: undefined,
      expiresAt: expect.any(Number),
    });
    // Expiry is anchored ~REFRESH_TOKEN_EXPIRY (default 7d) ahead of now.
    expect(req.session.openidTokens.expiresAt).toBeGreaterThanOrEqual(before + 604800000);
  });

  it('persists the OIDC refresh credential only when passed EXPLICITLY (REUSE path)', () => {
    const tokenset = { id_token: 'id', access_token: 'acc', refresh_token: 'tokenset-refresh' };
    const req = { session: {} };

    // The REUSE caller (setOpenIDAuthTokens) resolves and passes the credential.
    persistOpenIDTokensToSession(req, tokenset, 'explicit-refresh');

    expect(req.session.openidTokens.refreshToken).toBe('explicit-refresh');
  });

  it('returns false and warns when no session is available (never a cookie)', () => {
    const req = { session: null };
    const result = persistOpenIDTokensToSession(req, { access_token: 'acc' });

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns false when no tokenset is provided', () => {
    const req = { session: {} };
    const result = persistOpenIDTokensToSession(req, undefined);

    expect(result).toBe(false);
    expect(req.session.openidTokens).toBeUndefined();
  });
});
