const jwt = require('jsonwebtoken');

jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

jest.mock('../requireJwtAuth', () => jest.fn((req, res, next) => next('jwt-fallback')));

const requireJwtAuth = require('../requireJwtAuth');
const requireGuestOrJwtAuth = require('../requireGuestOrJwtAuth');

const JWT_SECRET = 'test-guest-secret';

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

const guestToken = (claims = {}) =>
  jwt.sign({ id: 'guest_abc', guest: true, role: 'GUEST', ...claims }, JWT_SECRET);

describe('requireGuestOrJwtAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ALLOW_GUEST_CHAT = 'true';
  });

  afterEach(() => {
    delete process.env.ALLOW_GUEST_CHAT;
  });

  it('delegates to requireJwtAuth when guest chat is disabled', () => {
    process.env.ALLOW_GUEST_CHAT = 'false';
    const req = { headers: { authorization: `Bearer ${guestToken()}` } };
    const next = jest.fn();
    requireGuestOrJwtAuth(req, mockRes(), next);
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('authenticates a valid guest token as an ephemeral GUEST principal', () => {
    const req = { headers: { authorization: `Bearer ${guestToken()}` } };
    const next = jest.fn();
    requireGuestOrJwtAuth(req, mockRes(), next);
    expect(requireJwtAuth).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'guest_abc', role: 'GUEST', guest: true });
  });

  it('delegates to requireJwtAuth when no bearer token is present', () => {
    const req = { headers: {} };
    requireGuestOrJwtAuth(req, mockRes(), jest.fn());
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('delegates to requireJwtAuth for a non-guest (regular) JWT', () => {
    const userToken = jwt.sign({ id: 'real-user' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${userToken}` } };
    requireGuestOrJwtAuth(req, mockRes(), jest.fn());
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('delegates to requireJwtAuth for a token signed with the wrong secret (fail closed)', () => {
    const forged = jwt.sign({ id: 'guest_x', guest: true }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${forged}` } };
    requireGuestOrJwtAuth(req, mockRes(), jest.fn());
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('delegates to requireJwtAuth when guest claim is missing', () => {
    const token = jwt.sign({ id: 'guest_x' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireGuestOrJwtAuth(req, mockRes(), jest.fn());
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('delegates to requireJwtAuth when guest token lacks an id', () => {
    const token = jwt.sign({ guest: true }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireGuestOrJwtAuth(req, mockRes(), jest.fn());
    expect(requireJwtAuth).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});
