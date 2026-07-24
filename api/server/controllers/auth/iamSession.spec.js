const mockVerifyIamToken = jest.fn();
const mockSetAuthTokens = jest.fn();
const mockPersistOpenIDTokensToSession = jest.fn();
const mockGetAppConfig = jest.fn();
const mockCheckBan = jest.fn();
const mockFindOpenIDUser = jest.fn();
const mockGetBalanceConfig = jest.fn();
const mockFindUser = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockCountUsers = jest.fn();
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

jest.mock('@hanzochat/data-schemas', () => ({
  logger: mockLogger,
}));

jest.mock('@hanzochat/data-provider', () => ({
  SystemRoles: { USER: 'USER', ADMIN: 'ADMIN' },
}));

jest.mock('@hanzochat/api', () => ({
  findOpenIDUser: (...args) => mockFindOpenIDUser(...args),
  getBalanceConfig: (...args) => mockGetBalanceConfig(...args),
}));

jest.mock('~/server/services/iamToken', () => ({
  verifyIamToken: (...args) => mockVerifyIamToken(...args),
}));

jest.mock('~/server/services/AuthService', () => ({
  setAuthTokens: (...args) => mockSetAuthTokens(...args),
  persistOpenIDTokensToSession: (...args) => mockPersistOpenIDTokensToSession(...args),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: (...args) => mockGetAppConfig(...args),
}));

jest.mock('~/server/middleware', () => ({
  checkBan: (...args) => mockCheckBan(...args),
}));

jest.mock('~/models', () => ({
  findUser: (...args) => mockFindUser(...args),
  createUser: (...args) => mockCreateUser(...args),
  updateUser: (...args) => mockUpdateUser(...args),
  countUsers: (...args) => mockCountUsers(...args),
}));

const { iamSessionController } = require('./iamSession');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('iamSessionController — @hanzo/iam session-bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAuthTokens.mockResolvedValue('chat.jwt.token');
    mockPersistOpenIDTokensToSession.mockReturnValue(true);
    mockGetAppConfig.mockResolvedValue({ balance: { enabled: false } });
    mockGetBalanceConfig.mockReturnValue({ enabled: false });
    mockCheckBan.mockImplementation(async (req) => {
      req.banned = false;
    });
    mockCountUsers.mockResolvedValue(5);
  });

  it('400 when neither token is provided', async () => {
    const req = { body: {}, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockVerifyIamToken).not.toHaveBeenCalled();
  });

  it('401 when token verification fails', async () => {
    mockVerifyIamToken.mockRejectedValue(new Error('bad signature'));
    const req = { body: { idToken: 'x.y.z' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockSetAuthTokens).not.toHaveBeenCalled();
  });

  it('401 when verified claims have no sub', async () => {
    mockVerifyIamToken.mockResolvedValue({ email: 'a@b.com' });
    const req = { body: { idToken: 'x.y.z' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('validates the id_token (not the access token) as the identity assertion', async () => {
    mockVerifyIamToken.mockResolvedValue({ sub: 'hanzo/alice', email: 'alice@hanzo.ai' });
    mockFindOpenIDUser.mockResolvedValue({
      user: { _id: 'u1', provider: 'openid', openidId: 'hanzo/alice', role: 'USER' },
      error: null,
      migration: false,
    });
    mockUpdateUser.mockResolvedValue({
      _id: 'u1',
      provider: 'openid',
      openidId: 'hanzo/alice',
      email: 'alice@hanzo.ai',
      role: 'USER',
    });
    const req = {
      body: { idToken: 'ID.TOK', accessToken: 'ACC.TOK' },
      session: {},
      headers: {},
    };
    const res = makeRes();
    await iamSessionController(req, res);
    expect(mockVerifyIamToken).toHaveBeenCalledWith('ID.TOK');
  });

  it('existing user: reconciles, issues chat session, persists id_token for OBO', async () => {
    mockVerifyIamToken.mockResolvedValue({
      sub: 'hanzo/alice',
      email: 'alice@hanzo.ai',
      name: 'Alice',
      owner: 'hanzo',
    });
    mockFindOpenIDUser.mockResolvedValue({
      user: { _id: 'u1', provider: 'openid', openidId: 'hanzo/alice', role: 'USER', name: 'Al' },
      error: null,
      migration: false,
    });
    mockUpdateUser.mockResolvedValue({
      _id: 'u1',
      provider: 'openid',
      openidId: 'hanzo/alice',
      email: 'alice@hanzo.ai',
      name: 'Alice',
      role: 'USER',
      toObject() {
        return { ...this };
      },
    });

    const req = {
      body: { idToken: 'ID.TOK', accessToken: 'ACC.TOK' },
      session: {},
      headers: {},
    };
    const res = makeRes();
    await iamSessionController(req, res);

    expect(mockUpdateUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ provider: 'openid', openidId: 'hanzo/alice' }),
    );
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockSetAuthTokens).toHaveBeenCalledWith('u1', res);
    // OBO: the id_token is persisted server-side (never a browser cookie).
    expect(mockPersistOpenIDTokensToSession).toHaveBeenCalledWith(req, {
      access_token: 'ACC.TOK',
      id_token: 'ID.TOK',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.token).toBe('chat.jwt.token');
    expect(payload.user.openidId).toBe('hanzo/alice');
  });

  it('new user: creates a provider=openid user keyed by sub', async () => {
    mockVerifyIamToken.mockResolvedValue({
      sub: 'hanzo/bob',
      email: 'bob@hanzo.ai',
      preferred_username: 'bob',
      email_verified: true,
      owner: 'hanzo',
    });
    mockFindOpenIDUser.mockResolvedValue({ user: null, error: null, migration: false });
    mockCountUsers.mockResolvedValue(3);
    mockCreateUser.mockResolvedValue({
      _id: 'u2',
      provider: 'openid',
      openidId: 'hanzo/bob',
      email: 'bob@hanzo.ai',
      role: 'USER',
      toObject() {
        return { ...this };
      },
    });

    const req = { body: { idToken: 'ID.TOK' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openid',
        openidId: 'hanzo/bob',
        username: 'bob',
        email: 'bob@hanzo.ai',
        emailVerified: true,
        role: 'USER',
      }),
      { enabled: false },
      true,
      true,
    );
    expect(mockSetAuthTokens).toHaveBeenCalledWith('u2', res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('first user becomes ADMIN', async () => {
    mockVerifyIamToken.mockResolvedValue({ sub: 'hanzo/root', email: 'root@hanzo.ai' });
    mockFindOpenIDUser.mockResolvedValue({ user: null, error: null, migration: false });
    mockCountUsers.mockResolvedValue(0);
    mockCreateUser.mockResolvedValue({ _id: 'u0', openidId: 'hanzo/root', role: 'ADMIN' });

    const req = { body: { idToken: 'ID.TOK' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      expect.anything(),
      true,
      true,
    );
  });

  it('403 when findOpenIDUser blocks cross-provider takeover', async () => {
    mockVerifyIamToken.mockResolvedValue({ sub: 'hanzo/eve', email: 'eve@hanzo.ai' });
    mockFindOpenIDUser.mockResolvedValue({ user: null, error: 'AUTH_FAILED', migration: false });
    const req = { body: { idToken: 'ID.TOK' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSetAuthTokens).not.toHaveBeenCalled();
  });

  it('banned principal: no session issued', async () => {
    mockVerifyIamToken.mockResolvedValue({ sub: 'hanzo/ban', email: 'ban@hanzo.ai' });
    mockFindOpenIDUser.mockResolvedValue({
      user: { _id: 'u3', provider: 'openid', openidId: 'hanzo/ban', role: 'USER' },
      error: null,
      migration: false,
    });
    mockUpdateUser.mockResolvedValue({ _id: 'u3', openidId: 'hanzo/ban', role: 'USER' });
    mockCheckBan.mockImplementation(async (req) => {
      req.banned = true;
    });

    const req = { body: { idToken: 'ID.TOK' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);

    expect(mockSetAuthTokens).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('OBO persist failure never breaks login', async () => {
    mockVerifyIamToken.mockResolvedValue({ sub: 'hanzo/al', email: 'al@hanzo.ai' });
    mockFindOpenIDUser.mockResolvedValue({
      user: { _id: 'u4', provider: 'openid', openidId: 'hanzo/al', role: 'USER' },
      error: null,
      migration: false,
    });
    mockUpdateUser.mockResolvedValue({ _id: 'u4', openidId: 'hanzo/al', role: 'USER' });
    mockPersistOpenIDTokensToSession.mockImplementation(() => {
      throw new Error('no session');
    });

    const req = { body: { idToken: 'ID.TOK' }, session: {}, headers: {} };
    const res = makeRes();
    await iamSessionController(req, res);

    expect(mockSetAuthTokens).toHaveBeenCalledWith('u4', res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
