const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { removePorts } = require('~/server/utils');

const { GUEST_TOKEN_WINDOW = 60, GUEST_TOKEN_MAX = 20 } = process.env;

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
 */
const guestTokenLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: removePorts,
  store: limiterCache('guest_token_limiter'),
});

module.exports = { guestTokenLimiter };
