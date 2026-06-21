const jwt = require('jsonwebtoken');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('./requireJwtAuth');
const { getGuestConfig, GUEST_ROLE } = require('~/server/services/guestConfig');

/**
 * Extracts a bearer token from the Authorization header.
 * @param {ServerRequest} req
 * @returns {string|null}
 */
const getBearerToken = (req) => {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
};

/**
 * Guest-aware authentication, applied ONLY to chat-completion routes.
 *
 * When `ALLOW_GUEST_CHAT` is enabled and the bearer token is a valid guest token
 * (`guest: true`, signed with `JWT_SECRET`), an ephemeral guest principal is set
 * on `req.user` and the request proceeds. Otherwise the request falls through to
 * the standard `requireJwtAuth`, which rejects guest tokens everywhere else
 * (the `jwt` strategy requires a matching DB user). Fail closed by construction.
 *
 * @param {ServerRequest} req
 * @param {ServerResponse} res
 * @param {import('express').NextFunction} next
 */
const requireGuestOrJwtAuth = (req, res, next) => {
  const config = getGuestConfig();
  if (!config.enabled) {
    return requireJwtAuth(req, res, next);
  }

  const token = getBearerToken(req);
  if (!token) {
    return requireJwtAuth(req, res, next);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_err) {
    return requireJwtAuth(req, res, next);
  }

  if (payload?.guest !== true || !payload.id) {
    return requireJwtAuth(req, res, next);
  }

  req.user = {
    id: payload.id,
    role: GUEST_ROLE,
    guest: true,
  };
  logger.debug(`[requireGuestOrJwtAuth] Guest principal authenticated: ${payload.id}`);
  return next();
};

module.exports = requireGuestOrJwtAuth;
