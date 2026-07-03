const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { guestClientIp } = require('~/server/utils');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GUEST_TOKEN_WINDOW = parsePositiveInt(process.env.GUEST_TOKEN_WINDOW, 60);
const GUEST_TOKEN_MAX = parsePositiveInt(process.env.GUEST_TOKEN_MAX, 20);

const windowMs = GUEST_TOKEN_WINDOW * 60 * 1000;
const max = GUEST_TOKEN_MAX;
const windowInMinutes = windowMs / 60000;

const handler = (req, res) => {
  return res.status(429).json({
    message: `Too many guest sessions, please try again after ${windowInMinutes} minutes.`,
  });
};

/**
 * Per-IP rate limiter for guest token issuance.
 *
 * Caps how many guest tokens a single client IP can mint per window so nobody can
 * spam-mint tokens (a DoS / quota-probe vector). Keyed on the REAL client IP
 * (`guestClientIp` → Cloudflare `CF-Connecting-IP`) and backed by the shared
 * Redis `limiterCache` so the cap holds across replicas. Note this is defense in
 * depth only: even unlimited tokens cannot multiply the message quota, which is
 * itself keyed per-IP (see `guestMessageLimiter`).
 */
const guestTokenLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: guestClientIp,
  store: limiterCache('guest_token_limiter'),
});

module.exports = { guestTokenLimiter };
