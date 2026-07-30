/**
 * Renew the on-behalf-of IAM bearer, and nothing else.
 *
 * Chat forwards the caller's OWN hanzo.id bearer to cloud so a completion bills to
 * their org. `resolveTenantBearer` requires that bearer UNEXPIRED, and the id_token
 * lives ~1h — so an hour into a perfectly valid chat session cloud started refusing
 * and the honest sentence for it ("Your Hanzo session needs refreshing", see
 * routes/askMessage.js) was the only thing left to say. Reloading worked because it
 * re-authenticated from scratch, which is why it came back an hour later.
 *
 * DELIBERATELY not the OPENID_REUSE_TOKENS path. That flag changes the whole session
 * model — requireJwtAuth, optionalJwtAuth and validateImageRequest all branch on it
 * and switch to the openid_user_id cookie — so turning it on to fix a bearer would
 * change how every route authenticates. This renews the bearer alone and leaves the
 * browser session, its cookies, /v1/chat/auth/refresh and logout untouched.
 *
 * Reads `session.iamBearerRefresh`, never `session.openidTokens.refreshToken`:
 * AuthController and LogoutController own that second field.
 *
 * Inert unless the authorize request asked for `offline_access` — with no refresh
 * credential in the session this returns false immediately and the caller behaves
 * exactly as it did before.
 */

const { refreshTokenGrant } = require('openid-client');
const { logger } = require('~/config');

/**
 * Loaded on FIRST USE, not at module load.
 *
 * `~/strategies/openidStrategy` reaches services/Files/strategies and from there
 * Firebase, so requiring it at the top pulls that whole graph into every consumer
 * of this file — and into routes/ask.js, whose tests then cannot load it at all
 * ("Cannot find module firebase/storage"). askMessage.js is a separate module for
 * the same reason: the answer path is kept loadable without the heavy client.
 *
 * A session with no refresh credential never reaches this, so the common path pays
 * nothing for it.
 */
function loadOpenIdConfig() {
  try {
    return require('~/strategies/openidStrategy').getOpenIdConfig();
  } catch (err) {
    logger.debug('[refreshIamBearer] OpenID strategy unavailable', { message: err?.message });
    return null;
  }
}

/**
 * @param {Object} req  request carrying the express-session
 * @returns {Promise<boolean>} true when the session now holds a fresh bearer
 */
async function refreshIamBearer(req) {
  const refreshToken = req.session?.iamBearerRefresh;
  if (!refreshToken) {
    return false;
  }

  const config = loadOpenIdConfig();
  if (!config) {
    logger.debug('[refreshIamBearer] no OpenID config; cannot renew the bearer');
    return false;
  }

  try {
    const tokenset = await refreshTokenGrant(config, refreshToken);
    if (!tokenset?.id_token && !tokenset?.access_token) {
      return false;
    }

    // Merge, never replace: expiresAt belongs to the browser session's own clock and
    // is not ours to move, and `refreshToken` in here is AuthController's field.
    req.session.openidTokens = {
      ...(req.session.openidTokens || {}),
      accessToken: tokenset.access_token,
      idToken: tokenset.id_token,
    };

    // IAM may rotate the refresh credential on use. Keeping the old one after a
    // rotation would renew exactly once and then fail every hour after.
    if (tokenset.refresh_token) {
      req.session.iamBearerRefresh = tokenset.refresh_token;
    }
    return true;
  } catch (err) {
    // A refused refresh is a real end-of-session: the credential was revoked, the
    // user signed out elsewhere, or it expired. Not an error to surface — the caller
    // falls through to the same honest refusal it produced before this existed.
    logger.debug('[refreshIamBearer] refresh grant refused', { message: err?.message });
    delete req.session.iamBearerRefresh;
    return false;
  }
}

module.exports = { refreshIamBearer };
