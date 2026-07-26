// file deepcode ignore NoRateLimitingForLogin: `loginLimiter` is applied per-route to the IdP-initiation GETs (not the machine-driven /callback routes, which would break the OIDC code exchange)
const express = require('express');
const passport = require('passport');
const { randomState } = require('openid-client');
const { logger } = require('@hanzochat/data-schemas');
const { ErrorTypes } = require('@hanzochat/data-provider');
const { createSetBalanceConfig } = require('@hanzochat/api');
const { checkDomainAllowed, loginLimiter, logHeaders } = require('~/server/middleware');
const { createOAuthHandler } = require('~/server/controllers/auth/oauth');
const { iamSessionController } = require('~/server/controllers/auth/iamSession');
const { getAppConfig } = require('~/server/services/Config');
const { Balance } = require('~/db/models');

const setBalanceConfig = createSetBalanceConfig({
  getAppConfig,
  Balance,
});

const router = express.Router();

const domains = {
  client: process.env.DOMAIN_CLIENT,
  server: process.env.DOMAIN_SERVER,
};

router.use(logHeaders);

const oauthHandler = createOAuthHandler();

router.get('/error', (req, res) => {
  /** A single error message is pushed by passport when authentication fails. */
  const errorMessage = req.session?.messages?.pop() || 'Unknown OAuth error';
  logger.error('Error in OAuth authentication:', {
    message: errorMessage,
  });

  res.redirect(`${domains.client}/login?redirect=false&error=${ErrorTypes.AUTH_FAILED}`);
});

/**
 * Hanzo IAM session-bridge — the ONE way the @hanzo/iam SPA establishes a Chat
 * session. The SPA runs Authorization-Code + PKCE in the browser and POSTs its
 * token here; the controller JWKS-validates it, reconciles the user, mints the
 * Chat session (refresh cookie + Mongo Session + Chat JWT), and persists the
 * id_token server-side for on-behalf-of cloud calls.
 */
router.post('/iam/session', iamSessionController);

/**
 * Server-initiated OpenID Connect routes (dormant fallback).
 *
 * The @hanzo/iam SPA does NOT use these — user login flows entirely through the
 * SPA + `/iam/session` bridge above. These remain only as an untouched safety
 * net for any deployment still pinned to the server-side redirect flow; they are
 * scheduled for removal once the SPA bridge is verified live end-to-end.
 */
router.get('/openid', loginLimiter, (req, res, next) => {
  return passport.authenticate('openid', {
    session: false,
    state: randomState(),
  })(req, res, next);
});

router.get(
  '/openid/callback',
  passport.authenticate('openid', {
    failureRedirect: `${domains.client}/oauth/error`,
    failureMessage: true,
    session: false,
  }),
  setBalanceConfig,
  checkDomainAllowed,
  oauthHandler,
);

module.exports = router;
