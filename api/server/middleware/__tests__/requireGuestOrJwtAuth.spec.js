jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

// Mock @hanzochat/api's isEnabled (the only symbol guestConfig needs) so the real
// package dist — which eagerly pulls the agents/langchain bundle (ESM, unparseable
// by this jest config) — never enters the module graph. Same behavior guestConfig
// relies on, kept hermetic like the sibling guest specs.
jest.mock('@hanzochat/api', () => ({
  isEnabled: (value) => value === 'true' || value === true,
}));

jest.mock('../requireJwtAuth', () => jest.fn((req, res, next) => next('jwt-fallback')));

const requireJwtAuth = require('../requireJwtAuth');
const requireGuestOrJwtAuth = require('../requireGuestOrJwtAuth');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

/**
 * A guest holds nothing. That is the whole design, and these tests pin both
 * halves of it: no bearer means an anonymous visitor, and a bearer — any bearer
 * — means IAM decides. There is no third case, because there is no longer a
 * credential this app issues that could be presented here.
 */
describe('requireGuestOrJwtAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_GUEST_CHAT = 'true';
  });

  afterEach(() => {
    delete process.env.ALLOW_GUEST_CHAT;
  });

  const run = (headers) => {
    const req = { headers };
    const next = jest.fn();
    requireGuestOrJwtAuth(req, mockRes(), next);
    return { req, next };
  };

  it('admits a visitor carrying nothing as an anonymous guest', () => {
    const { req, next } = run({});
    expect(requireJwtAuth).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ role: 'GUEST', name: 'Guest', guest: true });
  });

  it('gives that guest a stable id, so they can read back their own reply', () => {
    const headers = { 'cf-connecting-ip': '203.0.113.7' };
    expect(run(headers).req.user.id).toBe(run(headers).req.user.id);
  });

  it('tells two visitors apart', () => {
    expect(run({ 'cf-connecting-ip': '203.0.113.7' }).req.user.id).not.toBe(
      run({ 'cf-connecting-ip': '198.51.100.4' }).req.user.id,
    );
  });

  it('keeps the visitor address out of the id it hands around', () => {
    expect(run({ 'cf-connecting-ip': '203.0.113.7' }).req.user.id).not.toContain('203.0.113.7');
  });

  it.each([['Bearer '], ['Bearer   ']])(
    'treats %j as no credential, not as a claim to be somebody',
    (authorization) => {
      const { req, next } = run({ authorization });
      expect(requireJwtAuth).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toMatchObject({ guest: true });
    },
  );

  it('sends anyone presenting a bearer to IAM', () => {
    const { req } = run({ authorization: 'Bearer some-iam-token' });
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('requires an identity of everyone when guest chat is off', () => {
    process.env.ALLOW_GUEST_CHAT = 'false';
    const { req } = run({});
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});
