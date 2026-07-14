const express = require('express');
const { ACTIVE_ORG_COOKIE } = require('@hanzochat/api');
const {
  updateUserPluginsController,
  resendVerificationController,
  getTermsStatusController,
  acceptTermsController,
  verifyEmailController,
  deleteUserController,
  getUserController,
} = require('~/server/controllers/UserController');
const {
  verifyEmailLimiter,
  configMiddleware,
  canDeleteAccount,
  requireJwtAuth,
  requireGuestOrJwtAuth,
} = require('~/server/middleware');

const settings = require('./settings');

const router = express.Router();

router.use('/settings', settings);
router.get('/', requireGuestOrJwtAuth, getUserController);
router.get('/terms', requireJwtAuth, getTermsStatusController);
router.post('/terms/accept', requireJwtAuth, acceptTermsController);
router.post('/plugins', requireJwtAuth, updateUserPluginsController);
router.post('/active-org', requireJwtAuth, (req, res) => {
  // Pin the active org for downstream api.hanzo.ai calls. Fail closed: the org must
  // be in the caller's own membership set (owner + IAM `groups`); the gateway then
  // re-validates X-Org-Id ∈ the verified membership set (HIP-0026), so this cookie
  // is only ever a selection HINT.
  const requested = String(req.body?.organization ?? '').trim();
  const allowed = new Set([req.user?.organization, ...(req.user?.groups ?? [])].filter(Boolean));
  if (!requested || !allowed.has(requested)) {
    return res.status(400).json({ error: 'organization not in your memberships' });
  }
  res.cookie(ACTIVE_ORG_COOKIE, requested, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  return res.json({ organization: requested });
});
router.delete('/delete', requireJwtAuth, canDeleteAccount, configMiddleware, deleteUserController);
router.post('/verify', verifyEmailController);
router.post('/verify/resend', verifyEmailLimiter, resendVerificationController);

module.exports = router;
