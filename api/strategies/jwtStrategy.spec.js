const { SystemRoles } = require('librechat-data-provider');

// --- Capture the verify callback passed to JwtStrategy ---
let capturedVerifyCallback;
jest.mock('passport-jwt', () => ({
  Strategy: jest.fn((_opts, verifyCallback) => {
    capturedVerifyCallback = verifyCallback;
    return { name: 'jwt' };
  }),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(() => 'mock-extractor'),
  },
}));
jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));
jest.mock('~/models', () => ({
  getUserById: jest.fn(),
  updateUser: jest.fn(),
}));

const { getUserById, updateUser } = require('~/models');
const jwtLogin = require('./jwtStrategy');

// Helper: invoke the captured verify callback as a promise
const invokeVerify = (payload) =>
  new Promise((resolve, reject) => {
    capturedVerifyCallback(payload, (err, user, info) => {
      if (err) {
        return reject(err);
      }
      resolve({ user, info });
    });
  });

describe('jwtStrategy verify callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Instantiate to capture the verify callback.
    jwtLogin();
  });

  it('rejects a guest token cleanly without touching the DB (no CastError → 401)', async () => {
    const { user } = await invokeVerify({ id: 'guest_abc-123', guest: true, role: 'GUEST' });
    // done(null, false) → passport responds 401, never 500.
    expect(user).toBe(false);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('never calls getUserById for a guest id, even if it would CastError', async () => {
    getUserById.mockRejectedValue(new Error('CastError: not an ObjectId'));
    const { user } = await invokeVerify({ id: 'guest_xyz', guest: true });
    expect(user).toBe(false);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('resolves a real user for a non-guest token', async () => {
    getUserById.mockResolvedValue({ _id: { toString: () => 'real-id' }, role: SystemRoles.USER });
    const { user } = await invokeVerify({ id: 'real-id' });
    expect(getUserById).toHaveBeenCalledWith('real-id', expect.any(String));
    expect(user).toMatchObject({ id: 'real-id', role: SystemRoles.USER });
  });

  it('returns false when a non-guest user is not found', async () => {
    getUserById.mockResolvedValue(null);
    const { user } = await invokeVerify({ id: 'missing-id' });
    expect(user).toBe(false);
  });

  it('propagates a DB error for a non-guest token (done(err, false))', async () => {
    getUserById.mockRejectedValue(new Error('db down'));
    await expect(invokeVerify({ id: 'real-id' })).rejects.toThrow('db down');
  });

  it('does not treat guest:false as a guest token', async () => {
    getUserById.mockResolvedValue({ _id: { toString: () => 'real-id' }, role: SystemRoles.USER });
    await invokeVerify({ id: 'real-id', guest: false });
    expect(getUserById).toHaveBeenCalledTimes(1);
  });

  it('backfills a missing role for a real user', async () => {
    getUserById.mockResolvedValue({ _id: { toString: () => 'real-id' } });
    const { user } = await invokeVerify({ id: 'real-id' });
    expect(updateUser).toHaveBeenCalledWith('real-id', { role: SystemRoles.USER });
    expect(user.role).toBe(SystemRoles.USER);
  });
});
