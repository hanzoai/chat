// file deepcode ignore NoRateLimitingForLogin: `loginLimiter` is applied per-route to the IdP-initiation GET (not the machine-driven /callback route, which would break the OIDC code exchange)
const express = require('express');
const passport = require('passport');
const { randomState } = require('openid-client');
const { logger } = require('@hanzochat/data-schemas');
const { ErrorTypes } = require('@hanzochat/data-provider');
const { createSetBalanceConfig } = require('@hanzochat/api');
const { createOAuthHandler } = require('~/server/controllers/auth/oauth');
const { iamSessionController } = require('~/server/controllers/auth/iamSession');
const { getAppConfig } = require('~/server/services/Config');
const { Balance } = require('~/db/models');
const { graphTokenController, refreshController } = require('~/server/controllers/AuthController');
const {
  regenerateBackupCodes,
  disable2FA,
  confirm2FA,
  enable2FA,
  verify2FA,
} = require('~/server/controllers/TwoFactorController');
const { verify2FAWithTempToken } = require('~/server/controllers/auth/TwoFactorAuthController');
const { logoutController } = require('~/server/controllers/auth/LogoutController');
const { guestTokenController } = require('~/server/controllers/auth/GuestController');
const middleware = require('~/server/middleware');

const router = express.Router();

const domains = {
  client: process.env.DOMAIN_CLIENT,
  server: process.env.DOMAIN_SERVER,
};

const setBalanceConfig = createSetBalanceConfig({ getAppConfig, Balance });

/**
 * Hanzo IAM session-bridge — the ONE way the @hanzo/iam SPA establishes a Chat
 * session. The SPA runs Authorization-Code + PKCE in the browser and POSTs its
 * token here; the controller JWKS-validates it, reconciles the user, mints the
 * Chat session (refresh cookie + Session row + Chat JWT), and persists the
 * id_token server-side for on-behalf-of cloud calls.
 */
router.post('/iam/session', middleware.logHeaders, iamSessionController);

/**
 * Server-initiated OpenID Connect routes (dormant fallback).
 *
 * The @hanzo/iam SPA does NOT use these — user login flows entirely through the
 * SPA + `/iam/session` bridge above. These remain only as an untouched safety
 * net for any deployment still pinned to the server-side redirect flow; they are
 * scheduled for removal once the SPA bridge has a full release behind it.
 */
router.get('/openid', middleware.logHeaders, middleware.loginLimiter, (req, res, next) => {
  return passport.authenticate('openid', {
    session: false,
    state: randomState(),
  })(req, res, next);
});

router.get(
  '/openid/callback',
  middleware.logHeaders,
  passport.authenticate('openid', {
    failureRedirect: `${domains.client}/v1/chat/auth/error`,
    failureMessage: true,
    session: false,
  }),
  setBalanceConfig,
  middleware.checkDomainAllowed,
  createOAuthHandler(),
);

router.get('/error', (req, res) => {
  /** A single error message is pushed by passport when authentication fails. */
  const errorMessage = req.session?.messages?.pop() || 'Unknown OAuth error';
  logger.error('Error in OAuth authentication:', { message: errorMessage });

  res.redirect(`${domains.client}/login?redirect=false&error=${ErrorTypes.AUTH_FAILED}`);
});

// Hanzo IAM (OpenID Connect) owns every credential step. The local
// email/password and third-party social login routes are intentionally
// absent; the only session-lifecycle routes kept here are logout, token
// refresh, 2FA and the graph token — all guarded by IAM-issued JWTs.
router.post('/logout', middleware.requireJwtAuth, logoutController);
router.post('/refresh', refreshController);
// Anonymous guest-preview token. Gated on ALLOW_GUEST_CHAT inside the controller
// (404 when off) and per-IP rate-limited so tokens can't be spam-minted.
router.post('/guest', middleware.guestTokenLimiter, middleware.checkBan, guestTokenController);
router.get('/2fa/enable', middleware.requireJwtAuth, enable2FA);
router.post('/2fa/verify', middleware.requireJwtAuth, verify2FA);
router.post('/2fa/verify-temp', middleware.checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', middleware.requireJwtAuth, confirm2FA);
router.post('/2fa/disable', middleware.requireJwtAuth, disable2FA);
router.post('/2fa/backup/regenerate', middleware.requireJwtAuth, regenerateBackupCodes);

router.get('/graph-token', middleware.requireJwtAuth, graphTokenController);

module.exports = router;
