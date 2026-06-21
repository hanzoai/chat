const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { removePorts } = require('~/server/utils');
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
 * Reuses the shared Redis-backed `limiterCache` infrastructure (same store as the
 * message limiters). It only counts requests made by an authenticated guest
 * principal; logged-in users skip the counter entirely. On exhaustion it returns
 * a `402 { type: 'GUEST_LIMIT' }` signal the client maps to the login gate.
 */
const guestMessageLimiter = rateLimit({
  windowMs: GUEST_LIMIT_WINDOW_MS,
  max: () => getGuestConfig().messageMax,
  handler,
  keyGenerator: removePorts,
  skip: (req) => req.user?.guest !== true,
  store: limiterCache('guest_message_limiter'),
});

module.exports = { guestMessageLimiter };
