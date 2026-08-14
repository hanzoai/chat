const passport = require('passport');

/**
 * Resolve a Hanzo IAM identity when the caller has one, and carry on when they
 * do not. Same single verification as {@link requireJwtAuth}; the only
 * difference is that an absent or invalid token is an answer rather than a
 * refusal, for routes that are public but personalize when signed in.
 *
 * @type {import('express').RequestHandler}
 */
const optionalJwtAuth = (req, res, next) => {
  const callback = (err, user) => {
    if (err) {
      return next(err);
    }
    if (user) {
      req.user = user;
    }
    next();
  };
  passport.authenticate('iam', { session: false }, callback)(req, res, next);
};

module.exports = optionalJwtAuth;
