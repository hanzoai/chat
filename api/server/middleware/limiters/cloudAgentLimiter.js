const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@hanzochat/api');
const { ViolationTypes } = require('@hanzochat/data-provider');
const logViolation = require('~/cache/logViolation');

/**
 * Per-user rate limiter for the cloud-agents proxy (`/v1/chat/agents/cloud/*`). A run
 * is a real, billable cloud chat completion that holds an upstream socket for up
 * to 30s, yet it bypasses the message limiters that guard the sibling completion
 * path. This caps a signed-in user to CLOUD_AGENT_USER_MAX requests per window so
 * a loop cannot degrade the shared backend or run up denial-of-wallet cost.
 * Keyed by user id (the route is JWT-only; guests never reach it).
 */
const {
  CLOUD_AGENT_USER_MAX = 30,
  CLOUD_AGENT_WINDOW = 1,
  CLOUD_AGENT_VIOLATION_SCORE: score,
} = process.env;

const windowMs = CLOUD_AGENT_WINDOW * 60 * 1000;
const max = Number(CLOUD_AGENT_USER_MAX);

const handler = async (req, res) => {
  const type = ViolationTypes.TOOL_CALL_LIMIT;
  const errorMessage = {
    type,
    max,
    limiter: 'user',
    windowInMinutes: windowMs / 60000,
  };

  await logViolation(req, res, type, errorMessage, score);
  res.status(429).json({ message: 'Too many cloud agent requests. Try again later.' });
};

const cloudAgentLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: (req) => req.user?.id,
  store: limiterCache('cloud_agent_limiter'),
});

module.exports = cloudAgentLimiter;
