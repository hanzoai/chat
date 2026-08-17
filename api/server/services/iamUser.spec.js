jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));
jest.mock('@hanzochat/data-provider', () => ({ SystemRoles: { USER: 'USER', ADMIN: 'ADMIN' } }));

const mockFindOpenIDUser = jest.fn();
jest.mock('@hanzochat/api', () => ({
  findOpenIDUser: (...args) => mockFindOpenIDUser(...args),
  getBalanceConfig: () => ({ enabled: false }),
}));
jest.mock('~/server/services/Config', () => ({ getAppConfig: async () => ({}) }));

const mockFindUser = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock('~/models', () => ({
  findUser: (...args) => mockFindUser(...args),
  createUser: (...args) => mockCreateUser(...args),
  updateUser: (...args) => mockUpdateUser(...args),
  countUsers: async () => 7,
}));

const { reconcileUser } = require('./iamUser');

const claims = { sub: 'iam-subject-1', email: 'newcomer@hanzo.ai', name: 'Newcomer', owner: 'hanzo' };

describe('the local record behind an IAM identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOpenIDUser.mockResolvedValue({ user: null, error: null, migration: false });
  });

  /**
   * A first sign-in arrives as a burst — the app opens with a dozen
   * authenticated requests at once, all carrying the same token, none of which
   * has a record to read yet. The record has to be created once and read by all
   * of them, because a request that cannot resolve the identity answers 401 to
   * a visitor who has just signed in.
   */
  it('creates the record once for a burst of first requests', async () => {
    let created = null;
    mockCreateUser.mockImplementation(async (fields) => {
      if (created) {
        throw new Error('E11000 duplicate key');
      }
      created = { _id: 'user-1', ...fields };
      return created;
    });

    const burst = await Promise.all([...Array(12)].map(() => reconcileUser(claims, 'token')));

    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    for (const user of burst) {
      expect(user).toBe(created);
    }
  });

  /**
   * The welcome card is for accounts that start here, so the flag is written at
   * creation rather than defaulted on the schema — a default reaches every
   * record that lacks the field, which is every account that already exists.
   */
  it('marks a new record as never having seen the welcome card', async () => {
    mockCreateUser.mockImplementation(async (fields) => ({ _id: 'user-1', ...fields }));

    await reconcileUser(claims, 'token');

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ toured: false }),
      expect.anything(),
      true,
      true,
    );
  });

  /**
   * An identity has exactly one record and the unique index decides who writes
   * it, so a caller that loses the insert reads what won rather than failing.
   */
  it('reads the record when another writer created it first', async () => {
    const winner = { _id: 'user-1', openidId: claims.sub };
    mockCreateUser.mockRejectedValue(new Error('E11000 duplicate key'));
    mockFindUser.mockResolvedValue(winner);

    await expect(reconcileUser(claims, 'token')).resolves.toBe(winner);
    expect(mockFindUser).toHaveBeenCalledWith({ openidId: claims.sub });
  });

  /** A create that failed for any other reason is still a failure. */
  it('refuses when the record cannot be written or found', async () => {
    mockCreateUser.mockRejectedValue(new Error('disk full'));
    mockFindUser.mockResolvedValue(null);

    await expect(reconcileUser(claims, 'token')).rejects.toThrow('disk full');
  });

  /** The in-flight reconcile is dropped when it settles, never kept as a cache. */
  it('resolves the identity again after the burst has settled', async () => {
    const existing = { _id: 'user-1', openidId: claims.sub, provider: 'openid', role: 'USER' };
    mockCreateUser.mockResolvedValue(existing);
    await reconcileUser(claims, 'token');

    mockFindOpenIDUser.mockResolvedValue({ user: existing, error: null, migration: false });
    await expect(reconcileUser(claims, 'token')).resolves.toBe(existing);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });
});
