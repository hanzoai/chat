const passport = require('passport');
const requireJwtAuth = require('../requireJwtAuth');

jest.mock('passport', () => ({
  authenticate: jest.fn(() => jest.fn()),
}));

/**
 * What this middleware actually does: pick a strategy, delegate, get out of the
 * way. Twenty lines.
 *
 * WHAT USED TO BE HERE, and why it is gone. This file carried thirteen tests
 * for a much richer middleware — an AsyncLocalStorage tenant context, a
 * CloudFront media-cookie refresh, and an OpenID reuse-cookie ownership check —
 * and not one of them had ever run. They arrived with two upstream syncs
 * (`Add Structured Logging Context`, `Refresh CloudFront Media Cookies`) that
 * brought the SPEC and not the CODE: `git log -S AsyncLocalStorage` and
 * `-S cloudfront` over the implementation return nothing, so it never had
 * either. Every one of them died in the file's own passport mock, which
 * expected `authenticate(strategy, options, callback)` while the implementation
 * calls the two-argument form — `TypeError: callback is not a function`, before
 * a single assertion was reached.
 *
 * Thirteen security-shaped test names asserting nothing is worse than no tests
 * at all: a reader skims them and believes this middleware isolates tenants and
 * checks cookie ownership. It does neither. If that middleware is ever adopted,
 * its tests come WITH it — they are not a description of this one.
 *
 * So what is left is small and true, and the third case is the one with teeth:
 * `token_provider` is an ordinary unsigned cookie any client can set, and it
 * chooses which strategy runs. That is safe for two reasons worth stating
 * rather than trusting — the branch is gated on `OPENID_REUSE_TOKENS` (false in
 * production, so the branch is dead there), and selecting a strategy is not
 * bypassing one: `openidJwt` still has to verify a real token. Nothing here
 * authorizes anything; it only decides who does the checking.
 */
describe('requireJwtAuth', () => {
  const run = (cookie) => {
    const req = { headers: cookie ? { cookie } : {} };
    const res = {};
    const next = jest.fn();
    requireJwtAuth(req, res, next);
    return passport.authenticate.mock.calls[0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENID_REUSE_TOKENS;
  });

  it('uses the chat JWT strategy by default', () => {
    const [strategy, options] = run();
    expect(strategy).toBe('jwt');
    expect(options).toEqual({ session: false });
  });

  it('uses the chat JWT strategy when the request carries no cookie at all', () => {
    expect(run()[0]).toBe('jwt');
  });

  it('IGNORES token_provider=openid while OPENID_REUSE_TOKENS is off', () => {
    // Production's configuration. A cookie the client writes must not move the
    // request onto another strategy while the feature that reads it is off.
    process.env.OPENID_REUSE_TOKENS = 'false';
    expect(run('token_provider=openid')[0]).toBe('jwt');
  });

  it('uses the OpenID JWT strategy only when reuse is ON and the cookie says openid', () => {
    process.env.OPENID_REUSE_TOKENS = 'true';
    const [strategy, options] = run('token_provider=openid');
    expect(strategy).toBe('openidJwt');
    expect(options).toEqual({ session: false });
  });

  it('stays on the chat JWT strategy for any other token_provider, reuse on or off', () => {
    process.env.OPENID_REUSE_TOKENS = 'true';
    expect(run('token_provider=local')[0]).toBe('jwt');
    jest.clearAllMocks();
    expect(run('other=1; token_provider=')[0]).toBe('jwt');
  });

  it('never establishes a passport session', () => {
    // `session: false` on every path — this app's session is its own JWT, and a
    // passport session beside it would be a second answer to "who is this".
    process.env.OPENID_REUSE_TOKENS = 'true';
    for (const cookie of [undefined, 'token_provider=openid', 'token_provider=local']) {
      jest.clearAllMocks();
      expect(run(cookie)[1]).toEqual({ session: false });
    }
  });
});
