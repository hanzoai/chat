const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { guestClientIp } = require('~/server/utils');
const { getGuestConfig } = require('~/server/services/guestConfig');

const GUEST_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const handler = (req, res) => {
  return res.status(402).json({
    type: 'GUEST_LIMIT',
    message: 'Guest message limit reached. Log in to continue.',
  });
};

/**
 * Per-IP quota limiter for anonymous guest chat completions.
 *
 * The key is the REAL client IP (`guestClientIp` → Cloudflare `CF-Connecting-IP`),
 * NOT the guest token, so clearing cookies, opening incognito, or minting a fresh
 * guest token does not reset the count. It only counts requests made by an
 * authenticated guest principal; logged-in users skip the counter entirely. On
 * exhaustion it returns `402 { type: 'GUEST_LIMIT' }`, the signal the client maps
 * to the login gate.
 *
 * The store comes from `limiterCache`, which returns `undefined` when `USE_REDIS`
 * is off — so `express-rate-limit` uses its in-process MemoryStore. At
 * `replicas: 1` with a `Recreate` rollout there is never a second live pod to
 * round-robin, so the in-memory count is the authoritative per-IP quota; Redis is
 * NOT required (it was killed platform-wide). The only reset is a pod restart — an
 * infrequent operational event, not an attacker-triggerable action.
 */
const guestMessageLimiter = rateLimit({
  windowMs: GUEST_LIMIT_WINDOW_MS,
  max: () => getGuestConfig().messageMax,
  handler,
  keyGenerator: guestClientIp,
  skip: (req) => req.user?.guest !== true,
  store: limiterCache('guest_message_limiter'),
});

module.exports = { guestMessageLimiter };
