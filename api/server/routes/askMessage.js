/**
 * The one honest sentence for an upstream refusal on the answer engine.
 *
 * Its own module because it is POLICY, not transport: which refusal gets which
 * words, and — the part that matters — which refusal earns the client's "Sign in"
 * button. The route pulls in the TS/ESM cloud client, so keeping this here also
 * makes it testable without loading any of that.
 */

/** The client renders a sign-in action for exactly this code. */
const SIGNIN_REQUIRED = 'ASK_SIGNIN_REQUIRED';

/**
 * @param {number} status  upstream status, already narrowed by relayStatus
 * @param {boolean} signedIn  the caller has a real session (not anonymous, not guest)
 */
function upstreamMessage(status, signedIn) {
  // 401 and 403 are NOT the same refusal: one is "we do not know who you are any
  // more", the other is "we know, and you may not". They get different words and,
  // below, different actions.
  if (status === 401 && !signedIn) {
    return 'Sign in with Hanzo to search — your Hanzo account funds this request.';
  }
  // A 401 for a caller who still HOLDS a token means IAM refused it, and the
  // browser has already tried to renew it with IAM's refresh grant before the
  // request was ever sent. So nothing on this side can recover it and the only
  // cure is a new sign-in.
  //
  // This used to say "reload the page and try again", from a time when there was no
  // durable refresh and a reload genuinely re-authenticated from scratch. Once
  // renewal landed, that sentence became advice that cannot work: reloading replays
  // a session whose refresh credential has just been discarded, so the user reloads
  // forever. The words follow the mechanism.
  if (status === 401) {
    return 'Your Hanzo sign-in has expired — sign in again to continue.';
  }
  if (status === 403) {
    return 'Your Hanzo account is not permitted to run this request.';
  }
  if (status === 402) {
    return 'This search is not covered by your current balance.';
  }
  if (status === 429) {
    return 'Too many searches right now — try again in a moment.';
  }
  return 'The answer engine is unavailable right now.';
}

/**
 * Whether this refusal is one that signing in would actually resolve — THE policy,
 * and the only place it is decided. The route used to hand-roll this condition at
 * each refusal while this function sat exported beside them, which is how the two
 * spellings drifted apart.
 *
 * A 401 always earns the button: the credential is gone and renewal has already
 * failed, whether or not a browser session remains. A 403 is about permission, so it
 * earns the button only for a caller who has not signed in yet — signing in again
 * cannot grant a permission the account does not have.
 */
function needsSignIn(status, signedIn) {
  if (status === 401) {
    return true;
  }
  return status === 403 && !signedIn;
}

module.exports = { upstreamMessage, needsSignIn, SIGNIN_REQUIRED };
