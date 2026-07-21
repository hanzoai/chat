const passport = require('passport');
const session = require('express-session');
const { CacheKeys } = require('@hanzochat/data-provider');
const { isEnabled, shouldUseSecureCookie } = require('@hanzochat/api');
const { logger, DEFAULT_SESSION_EXPIRY } = require('@hanzochat/data-schemas');
const { openIdJwtLogin, setupOpenId } = require('~/strategies');
const { getLogStores } = require('~/cache');

/**
 * Configures OpenID Connect (Hanzo IAM) for the application.
 * @param {Express.Application} app - The Express application instance.
 * @returns {Promise<void>}
 */
async function configureOpenId(app) {
  logger.info('Configuring OpenID Connect...');
  const sessionExpiry = Number(process.env.SESSION_EXPIRY) || DEFAULT_SESSION_EXPIRY;
  const sessionOptions = {
    secret: process.env.OPENID_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: getLogStores(CacheKeys.OPENID_SESSION),
    cookie: {
      maxAge: sessionExpiry,
      secure: shouldUseSecureCookie(),
    },
  };
  app.use(session(sessionOptions));
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
  logger.info('OpenID Connect configured successfully.');
}

/**
 * Configures Hanzo IAM (OpenID Connect) login. This is the single social
 * login path — every credential step is owned by Hanzo IAM.
 * @param {Express.Application} app
 */
const configureSocialLogins = async (app) => {
  logger.info('Configuring Hanzo IAM login...');

  // PUBLIC PKCE client: registration MUST NOT be gated on a client secret. A
  // public client has none (security is PKCE + signed state), and gating on
  // OPENID_CLIENT_SECRET is exactly what left the `openid` strategy unregistered
  // ("OpenID strategy not registered") and login dead. See AUTH_BILLING_CONTRACT.md.
  if (
    process.env.OPENID_CLIENT_ID &&
    process.env.OPENID_ISSUER &&
    process.env.OPENID_SCOPE &&
    process.env.OPENID_SESSION_SECRET
  ) {
    await configureOpenId(app);
  }
};

module.exports = configureSocialLogins;
