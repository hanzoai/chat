const passport = require('passport');

/**
 * Require a Hanzo IAM identity.
 *
 * The caller presents the access token IAM gave their browser; it is verified
 * against IAM's JWKS on the spot and thrown away. There is nothing to consult —
 * no cookie naming a provider, no session row, no second strategy — because chat
 * issues no credential of its own. IAM is the only thing that can say who is
 * calling, so asking it is the whole of authentication here.
 *
 * @type {import('express').RequestHandler}
 */
const requireJwtAuth = (req, res, next) =>
  passport.authenticate('iam', { session: false })(req, res, next);

module.exports = requireJwtAuth;
