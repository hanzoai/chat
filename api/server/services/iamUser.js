const { logger } = require('@hanzochat/data-schemas');
const { SystemRoles } = require('@hanzochat/data-provider');
const { findOpenIDUser, getBalanceConfig } = require('@hanzochat/api');
const { getAppConfig } = require('~/server/services/Config');
const { findUser, createUser, updateUser, countUsers } = require('~/models');

/**
 * The local record standing behind a verified Hanzo IAM identity.
 *
 * IAM says who someone is; this says what chat knows about them — their
 * conversations, balance, role, preferences. The record is a projection of the
 * identity, never a second source of it: it is keyed by the IAM subject and
 * every field it copies comes from verified claims.
 *
 * It is reconciled on the request itself, so a person who has just been given
 * access at hanzo.id can use chat immediately, with no enrolment step in
 * between.
 */

/** Coerce a claim to a string, else ''. */
function claimStr(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * The profile photo, from the ONE place hanzo.id actually publishes it.
 *
 * It is NOT in the id_token. Measured against production: a live token carries
 * iss/sub/aud/exp/nbf/iat/jti/scope/owner/organization/email/name/
 * preferred_username/displayName/billing_account/azp/tokenType/orgs — and no
 * `picture`. IAM's userinfo endpoint DOES publish it
 * (`internal/oidc/userinfo.go`: `putIf(info, "picture", u.Avatar)`), and its
 * discovery document advertises `picture` in `claims_supported`, which is what
 * made the token look like the place to read it.
 *
 * Read when the account is created, and otherwise only from the one endpoint
 * that renders a person's identity. Identification now happens on EVERY request,
 * and this is a network round trip: asking here for anyone whose photo is
 * missing would put two hops in front of every API call they ever make, forever,
 * to be told there is still no photo.
 *
 * Best-effort by construction: nobody should be locked out because a photo
 * could not be fetched, so every error resolves to '' and the caller falls back
 * to the initials it already draws.
 */
async function pictureFromUserinfo(accessToken) {
  const issuer = (process.env.OPENID_ISSUER || '').replace(/\/+$/, '');
  if (!accessToken || !issuer) {
    return '';
  }
  try {
    // ASK DISCOVERY WHERE USERINFO IS. Guessing the path costs a silent failure:
    // `/v1/iam/userinfo` looks right and 404s — the real endpoint is
    // `/v1/iam/oauth/userinfo`. Since every error here resolves to '', a wrong
    // path would have been invisible forever, which is the worst way to be
    // wrong. The issuer publishes the answer, so read it.
    const meta = await fetch(`${issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!meta.ok) {
      logger.debug(`[iamUser] discovery ${meta.status} — no photo`);
      return '';
    }
    const endpoint = claimStr((await meta.json())?.userinfo_endpoint);
    if (!endpoint) {
      logger.debug('[iamUser] issuer publishes no userinfo_endpoint — no photo');
      return '';
    }
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.debug(`[iamUser] userinfo ${res.status} — no photo`);
      return '';
    }
    return claimStr((await res.json())?.picture);
  } catch (err) {
    logger.debug('[iamUser] userinfo unreachable — no photo:', err?.message || err);
    return '';
  }
}

/** Best-effort display name from OIDC claims. */
function fullNameFromClaims(claims) {
  if (claimStr(claims.name)) {
    return claims.name;
  }
  const parts = [claims.given_name, claims.family_name].filter((p) => typeof p === 'string' && p);
  if (parts.length) {
    return parts.join(' ');
  }
  return claimStr(claims.preferred_username) || claimStr(claims.email) || '';
}

/**
 * What the claims say this record should hold, limited to the fields IAM owns.
 * @param {Record<string, any>} claims
 */
function projection(claims) {
  return {
    name: fullNameFromClaims(claims),
    username:
      claimStr(claims.preferred_username) ||
      claimStr(claims.username) ||
      (claimStr(claims.email) ? claims.email.split('@')[0] : claimStr(claims.sub)),
    organization:
      claimStr(claims.owner) || claimStr(claims.organization) || claimStr(claims.org) || '',
    project: claimStr(claims.project) || '',
    groups: Array.isArray(claims.groups) ? claims.groups : [],
  };
}

/**
 * Only the fields that actually differ.
 *
 * Identification runs per request now, so writing the projection unconditionally
 * would be a database write on every call. Nothing here changes between two
 * requests carrying the same token, so in the steady state this is empty and
 * the reconcile is a single read.
 *
 * @param {import('@hanzochat/data-schemas').IUser} user
 * @param {Record<string, any>} claims
 * @param {string} openidId
 */
function changes(user, claims, openidId) {
  const update = {};
  const next = projection(claims);

  if (user.provider !== 'openid') {
    update.provider = 'openid';
  }
  if (user.openidId !== openidId) {
    update.openidId = openidId;
  }
  if (next.name && next.name !== user.name) {
    update.name = next.name;
  }
  if (next.username && next.username !== user.username) {
    update.username = next.username;
  }
  if (next.organization && next.organization !== user.organization) {
    update.organization = next.organization;
  }
  if (next.project && next.project !== user.project) {
    update.project = next.project;
  }
  if (next.groups.length && next.groups.join() !== (user.groups || []).join()) {
    update.groups = next.groups;
  }
  if (!user.role) {
    update.role = SystemRoles.USER;
  }
  return update;
}

/**
 * Find — or on a first sign-in create — the local record for a verified IAM
 * identity.
 *
 * @param {Record<string, any>} claims - verified IAM token claims
 * @param {string} [accessToken] - the caller's token, for the one userinfo read
 * @returns {Promise<import('@hanzochat/data-schemas').IUser>}
 */
async function reconcileUser(claims, accessToken) {
  const openidId = claimStr(claims.sub);
  const email = claimStr(claims.email);
  const { user: found, error } = await findOpenIDUser({
    findUser,
    openidId,
    email: email || undefined,
    idOnTheSource: claimStr(claims.oid) || undefined,
    strategyName: 'iam',
  });
  if (error) {
    const err = new Error(error);
    err.status = 403;
    throw err;
  }

  if (found) {
    const update = changes(found, claims, openidId);
    // A manually-set avatar (`manual=true`) is the user's own choice and is
    // never overwritten by the one from the identity provider.
    const picture = claimStr(claims.picture);
    if (picture && !found.avatar) {
      update.avatar = picture;
    }
    if (Object.keys(update).length === 0) {
      return found;
    }
    return (await updateUser(found._id, update)) || found;
  }

  const appConfig = await getAppConfig();
  const isFirstRegisteredUser = (await countUsers()) === 0;
  return createUser(
    {
      provider: 'openid',
      openidId,
      email: email || '',
      emailVerified: claims.email_verified === true,
      avatar: claimStr(claims.picture) || (await pictureFromUserinfo(accessToken)),
      idOnTheSource: claimStr(claims.oid),
      role: isFirstRegisteredUser ? SystemRoles.ADMIN : SystemRoles.USER,
      ...projection(claims),
    },
    getBalanceConfig(appConfig),
    true,
    true,
  );
}

module.exports = { reconcileUser, pictureFromUserinfo, claimStr, fullNameFromClaims };
