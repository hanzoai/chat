const passport = require('passport');
const requireJwtAuth = require('../requireJwtAuth');

jest.mock('passport', () => ({
  authenticate: jest.fn(() => jest.fn()),
}));

/**
 * What this middleware does: delegate to the one strategy that can say who is
 * calling, and get out of the way.
 *
 * There used to be two, and an unsigned `token_provider` cookie chose between
 * them — a value any client could set deciding which code verified the caller.
 * It was defensible only because both strategies verified something. It is now
 * moot, and that is what these tests pin: whatever the request says about
 * itself, the answer comes from Hanzo IAM.
 */
describe('requireJwtAuth', () => {
  const run = (headers = {}) => {
    const next = jest.fn();
    requireJwtAuth({ headers }, {}, next);
    return passport.authenticate.mock.calls[0];
  };

  beforeEach(() => jest.clearAllMocks());

  it('verifies against Hanzo IAM', () => {
    const [strategy, options] = run();
    expect(strategy).toBe('iam');
    expect(options).toEqual({ session: false });
  });

  it('holds no session', () => {
    expect(run()[1]).toEqual({ session: false });
  });

  it.each([
    ['token_provider=chat', 'token_provider=chat'],
    ['token_provider=openid', 'token_provider=openid'],
    ['an unrelated cookie', 'theme=dark'],
  ])('ignores %s when choosing how to authenticate', (_name, cookie) => {
    expect(run({ cookie })[0]).toBe('iam');
  });
});
