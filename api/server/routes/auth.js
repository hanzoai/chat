const express = require('express');
const {
  graphTokenController,
  refreshController,
} = require('~/server/controllers/AuthController');
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
