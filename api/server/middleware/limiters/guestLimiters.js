const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { guestClientIp } = require('~/server/utils');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GUEST_TOKEN_WINDOW = parsePositiveInt(process.env.GUEST_TOKEN_WINDOW, 60);
// 20/hour/IP was too tight, and the way it failed was the problem: minting a
// guest token is how the LANDING renders at all, so an exhausted limiter did not
// degrade the preview — it replaced the product with a marketing page and threw
// away the visitor's deep-link `?q=`. Hitting it takes only a handful of reloads,
// and behind Cloudflare one CF-Connecting-IP can be an entire office.
//
// Raising it does NOT raise what a guest can spend. Two separate limiters, two
// separate concerns: this one caps how often a TOKEN may be minted (mint-spam),
// while `guestMessageLimiter` caps MESSAGES per real client IP at
// GUEST_MESSAGE_MAX (prod: 2) and is not reset by minting a fresh token,
// clearing cookies, or going incognito. Spend stays exactly where it was.
const GUEST_TOKEN_MAX = parsePositiveInt(process.env.GUEST_TOKEN_MAX, 120);

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
 * (`guestClientIp` → Cloudflare `CF-Connecting-IP`). The store comes from
 * `limiterCache`, which returns `undefined` when `USE_REDIS` is off — so
 * `express-rate-limit` uses its in-process MemoryStore. That is the correct
 * single source of truth for hanzo.chat's `replicas: 1` / `Recreate` deployment
 * (never two live pods, so no cross-pod round-robin to defeat), and it does NOT
 * require Redis (killed platform-wide). This is defense in depth only: even
 * unlimited tokens cannot multiply the message quota, which is itself keyed
 * per-IP (see `guestMessageLimiter`).
 */
const guestTokenLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: guestClientIp,
  store: limiterCache('guest_token_limiter'),
});

module.exports = { guestTokenLimiter };
