const requireJwtAuth = require('./requireJwtAuth');
const { getGuestConfig, buildGuestPrincipal } = require('~/server/services/guestConfig');

/**
 * Authentication for the routes an anonymous visitor may reach.
 *
 * A guest has no account, so there is no identity to prove and nothing to
 * verify: a request that carries no bearer becomes a guest, and a request that
 * carries one is a member and goes to IAM like every other route. Nothing is
 * issued to make this work — the visitor holds no credential at any point.
 *
 * Which visitor they are comes from `guestClientIp`, the same address the free
 * message quota has always keyed on, so the anonymous visitor has ONE identity
 * rather than a quota keyed on the network and a principal keyed on a token.
 * `enforceGuestScope` and `guestMessageLimiter` do the rest; this only answers
 * who is asking.
 *
 * @type {import('express').RequestHandler}
 */
const requireGuestOrJwtAuth = (req, res, next) => {
  /* An EMPTY bearer is not a claim to be anybody. A caller with no token can
     still send the header — `Bearer ` with nothing after it — and reading that
     as "presented a credential" sends a guest to IAM, which refuses them, which
     is a guest locked out of the one surface built for them. Ask whether there
     is a token, not whether there is a header. */
  const header = req.headers?.authorization;
  const hasBearer = header?.startsWith('Bearer ') && header.slice('Bearer '.length).trim() !== '';
  if (!hasBearer && getGuestConfig().enabled) {
    req.user = buildGuestPrincipal(req);
    return next();
  }
  return requireJwtAuth(req, res, next);
};

module.exports = requireGuestOrJwtAuth;
