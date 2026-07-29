const { upstreamMessage, needsSignIn } = require('./askMessage');

/**
 * A signed-in customer was told to "Sign in with Hanzo to search".
 *
 * Chat forwards the caller's own IAM bearer to cloud, and isForwardableToken
 * requires it UNEXPIRED. The id_token lives ~1h and chat has no durable refresh,
 * so an hour into a perfectly valid session cloud starts refusing — and every
 * refusal was rendered with the same "you are not signed in" copy. For someone
 * already signed in that is both wrong and unactionable.
 */
describe('upstreamMessage', () => {
  it('asks an ANONYMOUS caller to sign in — the one case where that helps', () => {
    expect(upstreamMessage(401, false)).toMatch(/Sign in with Hanzo/);
  });

  it('never tells a SIGNED-IN caller to sign in, on 401 or 403', () => {
    expect(upstreamMessage(401, true)).not.toMatch(/Sign in with Hanzo/);
    expect(upstreamMessage(403, true)).not.toMatch(/Sign in with Hanzo/);
  });

  it('names the real cause for a signed-in caller: a stale credential', () => {
    expect(upstreamMessage(401, true)).toMatch(/refreshing/i);
    expect(upstreamMessage(403, true)).toMatch(/refreshing/i);
  });

  it('treats 403 as stale even for an anonymous caller — a 403 is never "no session"', () => {
    expect(upstreamMessage(403, false)).not.toMatch(/Sign in with Hanzo/);
  });

  it('leaves the other refusals alone', () => {
    expect(upstreamMessage(402, true)).toMatch(/balance/i);
    expect(upstreamMessage(429, true)).toMatch(/Too many/i);
    expect(upstreamMessage(502, true)).toMatch(/unavailable/i);
  });
});

describe('needsSignIn — which refusal earns the Sign in button', () => {
  it('is true only for an anonymous 401', () => {
    expect(needsSignIn(401, false)).toBe(true);
  });

  it('is FALSE for a signed-in caller — the bug that put a Sign in button in front of a customer', () => {
    expect(needsSignIn(401, true)).toBe(false);
    expect(needsSignIn(403, true)).toBe(false);
  });

  it('is false for refusals signing in cannot fix', () => {
    expect(needsSignIn(402, false)).toBe(false);
    expect(needsSignIn(429, false)).toBe(false);
  });
});
