const { logger } = require('@hanzochat/data-schemas');
const { verifyIamToken } = require('~/server/services/iamToken');
const { reconcileUser } = require('~/server/services/iamUser');

/**
 * The one way chat learns who is calling.
 *
 * A request carries the access token Hanzo IAM gave the caller's browser. This
 * verifies it against IAM's JWKS, finds the local record behind the verified
 * subject, and puts it on the request. Nothing is minted, nothing is stored, and
 * the token is not kept — the next request proves itself again.
 *
 * Because the token IS the credential the caller presents, it is also the
 * credential chat forwards when it calls Hanzo Cloud on their behalf, so the
 * principal cloud sees is the principal that authenticated here, with no
 * separate copy to fall out of step.
 *
 * A Passport strategy is an object with a name and an `authenticate` method;
 * Passport supplies `success`/`fail`/`error` on the instance it calls. There is
 * no base class to extend and nothing else to implement.
 */
const iamStrategy = () => ({
  name: 'iam',

  /** @param {import('express').Request} req */
  authenticate(req) {
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      return this.fail({ message: 'no bearer token' }, 401);
    }
    const token = header.slice('Bearer '.length).trim();

    verifyIamToken(token)
      .then(async (claims) => {
        if (!claims?.sub) {
          return this.fail({ message: 'token has no subject' }, 401);
        }
        const user = await reconcileUser(claims, token);
        if (!user?._id) {
          return this.fail({ message: 'no account for this identity' }, 401);
        }
        user.id = user._id.toString();
        this.success(user);
      })
      .catch((err) => {
        if (err?.status === 403) {
          return this.fail({ message: err.message }, 403);
        }
        logger.debug('[iam] token rejected:', err?.message || err);
        this.fail({ message: 'invalid token' }, 401);
      });
  },
});

module.exports = iamStrategy;
