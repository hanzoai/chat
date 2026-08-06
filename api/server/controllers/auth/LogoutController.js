const cookies = require('cookie');
const { isEnabled, clearCloudFrontCookies } = require('@hanzochat/api');
const { logger } = require('@hanzochat/data-schemas');
const { logoutUser } = require('~/server/services/AuthService');
const { getOpenIdConfig } = require('~/strategies');

/**
 * Logging out has to end the session at the IdP, not only here.
 *
 * Clearing our own cookies signs the user out of this app while leaving
 * `__Host-hanzo_session` alive at hanzo.id — so the next "Log in with Hanzo"
 * gets a fresh code with no prompt and they are straight back in. That is what
 * "I cannot log out" is.
 *
 * RP-Initiated Logout wants a hint about WHO is logging out. Without one an OP
 * may show a confirm screen, or refuse `post_logout_redirect_uri` outright and
 * strand the user on the IdP. `id_token_hint` is the good hint; the rest of
 * this file is about what to do when it will not fit.
 */

/** Browsers and proxies stop honouring a URL somewhere past this. */
const DEFAULT_MAX_LOGOUT_URL_LENGTH = 2000;

/**
 * An id_token is a JWT and can run to several KB. Past the cap it is dropped in
 * favour of `logout_hint` + `client_id`, which identify the session to the OP
 * without carrying the whole token.
 */
const maxLogoutUrlLength = () => {
  const raw = process.env.OPENID_MAX_LOGOUT_URL_LENGTH;
  // Unset or empty is not a mistake — it is the default, silently.
  if (raw == null || String(raw).trim() === '') {
    return DEFAULT_MAX_LOGOUT_URL_LENGTH;
  }
  const trimmed = String(raw).trim();
  const parsed = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      `[logoutController] Invalid OPENID_MAX_LOGOUT_URL_LENGTH ("${raw}") — not a positive integer; using ${DEFAULT_MAX_LOGOUT_URL_LENGTH}.`,
    );
    return DEFAULT_MAX_LOGOUT_URL_LENGTH;
  }
  return parsed;
};

/** Who to name when the token itself will not fit. Least-identifying last. */
const logoutHintFor = (user) => user?.email || user?.username || user?.openidId || null;

const logoutController = async (req, res) => {
  const parsedCookies = req.headers.cookie ? cookies.parse(req.headers.cookie) : {};
  const isOpenIdUser = req.user?.openidId != null && req.user?.provider === 'openid';

  /** For OpenID users, read refresh token from session; for others, use cookie */
  let refreshToken;
  let idToken;
  if (isOpenIdUser && req.session?.openidTokens) {
    refreshToken = req.session.openidTokens.refreshToken;
    idToken = req.session.openidTokens.idToken;
    delete req.session.openidTokens;
  }
  refreshToken = refreshToken || parsedCookies.refreshToken;
  // The session is the better source, but it is gone on a cold process or after
  // a restart, and the cookie copy is the reason logout still works there.
  idToken = idToken || parsedCookies.openid_id_token;

  try {
    const logout = await logoutUser(req, refreshToken);
    const { status, message } = logout;

    res.clearCookie('refreshToken');
    res.clearCookie('openid_access_token');
    res.clearCookie('openid_id_token');
    res.clearCookie('openid_user_id');
    res.clearCookie('token_provider');
    clearCloudFrontCookies(res, { userId: req.user?._id, tenantId: req.user?.tenantId });

    const response = { message };
    if (
      isOpenIdUser &&
      isEnabled(process.env.OPENID_USE_END_SESSION_ENDPOINT) &&
      process.env.OPENID_ISSUER
    ) {
      let openIdConfig = null;
      try {
        openIdConfig = getOpenIdConfig();
      } catch (err) {
        // Throwing here is not fatal to logging out — the local session is
        // already gone. Say so and skip the redirect.
        logger.warn('[logoutController] OpenID config not available', err.message);
      }

      if (openIdConfig) {
        const endSessionEndpoint = openIdConfig.serverMetadata().end_session_endpoint;
        if (!endSessionEndpoint) {
          logger.warn(
            '[logoutController] end_session_endpoint not found in OpenID issuer metadata. Please verify that the issuer is correct.',
          );
        } else {
          const endSessionUrl = new URL(endSessionEndpoint);
          /** Redirect back to app's login page after IdP logout */
          const postLogoutRedirectUri =
            process.env.OPENID_POST_LOGOUT_REDIRECT_URI || `${process.env.DOMAIN_CLIENT}/login`;
          endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);

          const clientId = process.env.OPENID_CLIENT_ID;
          const limit = maxLogoutUrlLength();

          // Measure the URL WITH the token rather than guessing from the token's
          // length: the base URL and the encoded redirect count too.
          let usedIdToken = false;
          if (idToken) {
            const projected = new URL(endSessionUrl);
            projected.searchParams.set('id_token_hint', idToken);
            if (projected.toString().length <= limit) {
              endSessionUrl.searchParams.set('id_token_hint', idToken);
              usedIdToken = true;
            } else {
              logger.debug(
                `[logoutController] Logout URL too long (${projected.toString().length} > ${limit}) — falling back to logout_hint.`,
              );
            }
          }

          if (!usedIdToken) {
            const hint = logoutHintFor(req.user);
            if (hint) {
              endSessionUrl.searchParams.set('logout_hint', hint);
            }
            if (clientId) {
              endSessionUrl.searchParams.set('client_id', clientId);
            } else if (idToken) {
              // We had a token, dropped it for length, and have nothing to put
              // in its place — the OP will likely prompt.
              logger.warn(
                '[logoutController] OPENID_CLIENT_ID is not set, so a shortened logout URL carries no client identity.',
              );
            } else {
              logger.warn(
                '[logoutController] Neither id_token_hint nor OPENID_CLIENT_ID is available — the IdP may not end the session.',
              );
            }
          }

          response.redirect = endSessionUrl.toString();
        }
      }
    }
    return res.status(status).send(response);
  } catch (err) {
    logger.error('[logoutController]', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  logoutController,
};
