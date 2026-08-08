/**
 * What of a user record a browser may see.
 *
 * This is an ALLOW-LIST, and that is the whole point. Both places that hand a
 * user to the browser used to name what to withhold — the jwt strategy projects
 * `-password -__v -totpSecret -backupCodes` and the controller deletes three of
 * the same — and a deny-list is only ever correct for the fields somebody
 * thought of. Everything else ships by default, including a field added to the
 * schema tomorrow by someone who never read this file.
 *
 * That is not hypothetical. `refreshToken` is `[SessionSchema]` on the user
 * schema with no `select: false` beside it — unlike `backupCodes`, which has
 * one — so `GET /v1/chat/user` and every `/auth/refresh` answered with the
 * visitor's own refresh tokens as JSON. They already hold one, in an httpOnly
 * cookie; the point of httpOnly is that script cannot read it. Putting the same
 * credential in a response body hands it to any injected script, which turns
 * "act as this person while the tab is open" into "keep acting as them, from
 * anywhere, until the token expires". The severity is the reachability, not the
 * secrecy.
 *
 * So the question this module answers is the opposite one, and it is the only
 * question that closes the class: not "what must we remember to strip" but
 * "what has anyone actually asked for".
 *
 * WITHHELD, and why each is safe to withhold: `refreshToken` (above);
 * `totpSecret` / `backupCodes` (already `select: false`, listed so the intent
 * survives a schema edit); `__v` (mongoose's own counter); and the external
 * identity ids `googleId`/`facebookId`/`samlId`/`ldapId`/`githubId`/
 * `discordId`/`appleId`/`idOnTheSource`, which nothing in the client reads —
 * verified by grep, not assumed.
 *
 * `openidId` IS sent, deliberately, and a test asserting otherwise is wrong:
 * `Providers/AnalyticsProvider` reads it as the IAM `sub`, the one id that
 * correlates a person across hanzo.ai, hanzo.app and here. Chat's own `id` is a
 * different value and cannot stand in for it.
 */

/** Every field any consumer has actually asked for. Adding one is a decision. */
const PUBLIC = [
  // identity
  'id',
  '_id',
  'name',
  'username',
  'email',
  'emailVerified',
  'avatar',
  'provider',
  'role',
  // the IAM subject — cross-surface analytics identity, NOT chat's own row id
  'openidId',
  // tenancy: the org switcher in Nav/AccountSettings renders from these
  'organization',
  'organizationTitle',
  'organizationTag',
  'project',
  'groups',
  'tenantId',
  // preferences and state the app renders
  'plugins',
  'twoFactorEnabled',
  'termsAccepted',
  'personalization',
  'favorites',
  'skillStates',
  // lifecycle
  'createdAt',
  'updatedAt',
  'expiresAt',
];

/**
 * Project a user record onto what a browser may see.
 *
 * Absent keys are omitted rather than sent as `undefined`, so the response
 * carries no evidence of a field that was not set — and a caller can still tell
 * "no avatar" from "avatar: null" if it ever needs to.
 *
 * @param {object|null|undefined} user a user document or plain object
 * @returns {object|null|undefined} the same value when there is nothing to project
 */
function publicUser(user) {
  if (user == null) {
    return user;
  }
  const src = typeof user.toObject === 'function' ? user.toObject() : user;
  const out = {};
  for (const key of PUBLIC) {
    if (src[key] !== undefined) {
      out[key] = src[key];
    }
  }
  return out;
}

module.exports = { publicUser, PUBLIC };
