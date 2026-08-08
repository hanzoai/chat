import userSchema from './user';

/**
 * Which user fields the default projection is allowed to return.
 *
 * `refreshToken` is the one credential-shaped field on this schema — a legacy
 * array holding the token as a plain String, from before sessions moved to
 * their own collection with a `refreshTokenHash`. It carried no `select: false`
 * while `backupCodes` beside it did, so every ordinary `findById` loaded it and
 * it rode `GET /v1/chat/user` and `/auth/refresh` into the browser until
 * `services/publicUser` began projecting.
 *
 * That projection is the first lock and this is the second. They are worth
 * having separately: the projection protects the two endpoints that exist
 * today, and `select: false` protects the ones nobody has written yet — a new
 * route that returns a user document cannot leak a field the query never
 * loaded.
 *
 * Measured in production before the change: 28 users, ZERO with a non-empty
 * array, zero plaintext tokens at rest, against 130 rows in the hashed
 * `Session` store. Nothing writes it and nothing reads it. Deleting it is the
 * honest end state; it is not done here because chat is OSS and another
 * deployment may still hold rows, which a schema drop would orphan in silence.
 */
describe('user schema — default projection', () => {
  const optionsFor = (field: string) => {
    const path = userSchema.path(field) as unknown as { options?: { select?: boolean } };
    return path?.options ?? {};
  };

  it.each(['refreshToken', 'totpSecret', 'backupCodes'])(
    'withholds %s from the default projection',
    (field) => {
      expect(userSchema.path(field)).toBeDefined();
      expect(optionsFor(field).select).toBe(false);
    },
  );

  it('still returns the fields the app renders', () => {
    // The counterweight: `select: false` is easy to over-apply, and a field the
    // app needs but the query stops loading fails as a missing value rather
    // than an error, which is the slow kind of bug.
    for (const field of ['email', 'name', 'username', 'avatar', 'role', 'provider', 'openidId']) {
      expect(userSchema.path(field)).toBeDefined();
      expect(optionsFor(field).select).not.toBe(false);
    }
  });
});
