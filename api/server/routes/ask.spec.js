const { upstreamMessage, needsSignIn } = require('./askMessage');

/**
 * WHICH REFUSAL GETS WHICH WORDS — and which earns the Sign in button.
 *
 * This policy moved once, and the reason is worth keeping. It was written when chat
 * had NO durable refresh: the forwarded id_token lived ~1h, so an hour into a valid
 * session cloud started refusing, and telling that customer "you are not signed in"
 * was both wrong and unactionable. The answer then was "your session needs
 * refreshing — reload the page", because a reload really did re-authenticate from
 * scratch.
 *
 * Renewal has since moved to where the credential lives: the browser renews its
 * own token with IAM's refresh grant before a request is sent. So a 401 that
 * still reaches this policy is a token that has already failed to heal itself,
 * and "reload the page" became advice that cannot work: the reload replays a
 * token with nothing left to spend, forever.
 *
 * The invariant across both eras is the same — never give someone advice they cannot
 * act on — and it now points the other way for a signed-in 401.
 */
describe('upstreamMessage', () => {
  it('asks an ANONYMOUS caller to sign in — they have no session at all', () => {
    expect(upstreamMessage(401, false)).toMatch(/Sign in with Hanzo/);
  });

  it('tells a SIGNED-IN caller their sign-in expired, because renewal already failed', () => {
    expect(upstreamMessage(401, true)).toMatch(/sign in again/i);
  });

  it('never tells anyone to RELOAD — the advice that could not work', () => {
    for (const signedIn of [true, false]) {
      expect(upstreamMessage(401, signedIn)).not.toMatch(/reload/i);
      expect(upstreamMessage(403, signedIn)).not.toMatch(/reload/i);
    }
  });

  it('keeps 403 separate from 401: permission is not identity', () => {
    expect(upstreamMessage(403, true)).toMatch(/not permitted/i);
    expect(upstreamMessage(403, true)).not.toMatch(/sign in/i);
  });

  it('leaves the other refusals alone', () => {
    expect(upstreamMessage(402, true)).toMatch(/balance/i);
    expect(upstreamMessage(429, true)).toMatch(/Too many/i);
    expect(upstreamMessage(502, true)).toMatch(/unavailable/i);
  });
});

describe('needsSignIn — which refusal earns the Sign in button', () => {
  it('is true for EVERY 401: the credential is gone and renewal has already failed', () => {
    expect(needsSignIn(401, false)).toBe(true);
    expect(needsSignIn(401, true)).toBe(true);
  });

  it('is false for a signed-in 403 — no sign-in grants a permission you lack', () => {
    expect(needsSignIn(403, true)).toBe(false);
  });

  it('is true for an anonymous 403 — signing in is what they are missing', () => {
    expect(needsSignIn(403, false)).toBe(true);
  });

  it('is false for refusals signing in cannot fix', () => {
    expect(needsSignIn(402, false)).toBe(false);
    expect(needsSignIn(429, false)).toBe(false);
    expect(needsSignIn(502, false)).toBe(false);
  });
});
