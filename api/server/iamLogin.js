const passport = require('passport');
const session = require('express-session');
const { CacheKeys } = require('@hanzochat/data-provider');
const { isEnabled, shouldUseSecureCookie } = require('@hanzochat/api');
const { logger, DEFAULT_SESSION_EXPIRY } = require('@hanzochat/data-schemas');
const { openIdJwtLogin, setupOpenId } = require('~/strategies');
const { getLogStores } = require('~/cache');

/**
 * Configures Hanzo IAM (OpenID Connect) login — the ONE identity provider. Every
 * credential step is owned by IAM; there is no local password and no second
 * provider, so this is unconditional: the only thing that can skip it is IAM
 * not being configured at all, which leaves a server nobody can sign in to.
 *
 * PUBLIC PKCE client: registration MUST NOT be gated on a client secret. A public
 * client has none (security is PKCE + signed state), and gating on
 * OPENID_CLIENT_SECRET is exactly what left the `openid` strategy unregistered
 * ("OpenID strategy not registered") and login dead. See AUTH_BILLING_CONTRACT.md.
 *
 * @param {Express.Application} app - The Express application instance.
 * @returns {Promise<void>}
 */
const configureIamLogin = async (app) => {
  if (
    !process.env.OPENID_CLIENT_ID ||
    !process.env.OPENID_ISSUER ||
    !process.env.OPENID_SCOPE ||
    !process.env.OPENID_SESSION_SECRET
  ) {
    logger.error('Hanzo IAM is not configured — this server has no way to sign in.');
    return;
  }

  logger.info('Configuring Hanzo IAM login...');
  const sessionExpiry = Number(process.env.SESSION_EXPIRY) || DEFAULT_SESSION_EXPIRY;
  app.use(
    session({
      secret: process.env.OPENID_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: getLogStores(CacheKeys.OPENID_SESSION),
      cookie: {
        maxAge: sessionExpiry,
        secure: shouldUseSecureCookie(),
      },
    }),
  );
  app.use(passport.session());

  const config = await setupOpenId();
  if (!config) {
    logger.error('OpenID Connect configuration failed - strategy not registered.');
    return;
  }

  if (isEnabled(process.env.OPENID_REUSE_TOKENS)) {
    logger.info('OpenID token reuse is enabled.');
    passport.use('openidJwt', openIdJwtLogin(config));
  }
  logger.info('Hanzo IAM login configured successfully.');
};

module.exports = configureIamLogin;
