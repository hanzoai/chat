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
  // 401 and 403 are NOT the same refusal, and conflating them told a signed-in
  // customer to sign in. Chat forwards the caller's own IAM bearer and
  // isForwardableToken requires it UNEXPIRED — the id_token lives ~1h with no
  // durable refresh — so an hour into a valid session cloud starts refusing, and
  // the only honest reading is "your credential went stale", never "you are not
  // signed in". The client re-mints silently and retries once; this is what is
  // left when even that fails.
  if (status === 401 && !signedIn) {
    return 'Sign in with Hanzo to search — your Hanzo account funds this request.';
  }
  if (status === 401 || status === 403) {
    return 'Your Hanzo session needs refreshing — reload the page and try again.';
  }
  if (status === 402) {
    return 'This search is not covered by your current balance.';
  }
  if (status === 429) {
    return 'Too many searches right now — try again in a moment.';
  }
  return 'The answer engine is unavailable right now.';
}

/** Whether this refusal is one that signing in would actually resolve. */
function needsSignIn(status, signedIn) {
  return (status === 401 || status === 403) && !signedIn;
}

module.exports = { upstreamMessage, needsSignIn, SIGNIN_REQUIRED };
