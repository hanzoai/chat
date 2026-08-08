/**
 * The silent SSO probe, and above all its BOUND.
 *
 * This code navigates the whole document to the issuer on boot. Unbounded, that
 * is not a bug, it is hanzo.chat being unreachable — every load leaves for
 * hanzo.id, comes back, and leaves again. So the first four cases here are all
 * one question asked from different sides: can the probe ever run twice?
 */
import { exchanging, meansNoSession, probed, probeSession } from '../sso';

const mockSigninRedirect = jest.fn();
jest.mock('~/utils/iam', () => ({
  getHanzoIamSdk: () => ({ signinRedirect: (...args: unknown[]) => mockSigninRedirect(...args) }),
}));

/** Put the document on a path, the way a route change would. */
function at(pathname: string) {
  window.history.replaceState({}, '', pathname);
}

beforeEach(() => {
  sessionStorage.clear();
  mockSigninRedirect.mockReset();
  mockSigninRedirect.mockResolvedValue(undefined);
  at('/c/new');
});

describe('probeSession', () => {
  it('asks the issuer to answer from the session alone, and to render nothing', async () => {
    expect(await probeSession()).toBe(true);
    expect(mockSigninRedirect).toHaveBeenCalledWith({ additionalParams: { prompt: 'none' } });
  });

  it('runs once per visit — a second call does not navigate', async () => {
    await probeSession();
    expect(await probeSession()).toBe(false);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
  });

  it('marks the attempt BEFORE navigating, so a probe that never returns is still spent', async () => {
    // The issuer is unreachable and the SDK rejects. The attempt still counts:
    // retrying it is how a boot loop starts, and a visitor who stays a guest for
    // one visit is the cheap failure.
    mockSigninRedirect.mockRejectedValue(new Error('network gone'));
    expect(await probeSession()).toBe(false);
    expect(probed()).toBe(true);
    expect(await probeSession()).toBe(false);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
  });

  it('is spent by the first of two concurrent callers, never both', async () => {
    // Two effects can reach the fallback in the same tick. The marker is written
    // synchronously, before any await, so the second sees it.
    const [a, b] = await Promise.all([probeSession(), probeSession()]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
  });

  it('stays out of the callback route, where a code is mid-exchange', async () => {
    at('/auth/callback?code=abc&state=xyz');
    expect(await probeSession()).toBe(false);
    expect(mockSigninRedirect).not.toHaveBeenCalled();
    // Not spent either — this visit has not asked yet.
    expect(probed()).toBe(false);
  });

  it('stays out of /login, whose interactive redirect is the stronger request', async () => {
    at('/login');
    expect(await probeSession()).toBe(false);
    expect(mockSigninRedirect).not.toHaveBeenCalled();
  });

  it('does not run at all when storage cannot bound it', async () => {
    // Private mode / blocked cookies: with nowhere to record the attempt there is
    // no way to stop at one, so the probe declines rather than run unbounded.
    const storage = jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    try {
      expect(await probeSession()).toBe(false);
      expect(mockSigninRedirect).not.toHaveBeenCalled();
    } finally {
      storage.mockRestore();
    }
  });
});

describe('exchanging', () => {
  it('is true only while the callback route holds a code', () => {
    at('/auth/callback?code=abc&state=xyz');
    expect(exchanging()).toBe(true);
    at('/auth/callback?error=login_required&state=xyz');
    expect(exchanging()).toBe(true);
  });

  it('is false on the product, so the guest fallback still runs there', () => {
    at('/c/new');
    expect(exchanging()).toBe(false);
    at('/login');
    expect(exchanging()).toBe(false);
  });
});

describe('meansNoSession', () => {
  it.each(['login_required', 'interaction_required', 'consent_required', 'account_selection_required'])(
    'reads %s as "nobody is signed in", so the visitor goes back to the product',
    (error) => {
      expect(meansNoSession(error)).toBe(true);
    },
  );

  it('does not swallow a real failure', () => {
    // These are broken logins, and they must keep reaching the error path — a
    // guest redirect would hide a misconfigured client behind a working-looking
    // anonymous product.
    expect(meansNoSession('access_denied')).toBe(false);
    expect(meansNoSession('invalid_request')).toBe(false);
    expect(meansNoSession('unauthorized_client')).toBe(false);
    expect(meansNoSession(null)).toBe(false);
    expect(meansNoSession(undefined)).toBe(false);
    expect(meansNoSession('')).toBe(false);
  });
});
