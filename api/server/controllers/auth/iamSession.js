const { logger } = require('@hanzochat/data-schemas');
const { SystemRoles } = require('@hanzochat/data-provider');
const { findOpenIDUser, getBalanceConfig } = require('@hanzochat/api');
const { verifyIamToken } = require('~/server/services/iamToken');
const { setAuthTokens, persistOpenIDTokensToSession } = require('~/server/services/AuthService');
const { getAppConfig } = require('~/server/services/Config');
const { checkBan } = require('~/server/middleware');
const { findUser, createUser, updateUser, countUsers } = require('~/models');

/**
 * The session-bridge for the @hanzo/iam SPA login. This is the ONE server entry
 * that turns an IAM-verified identity into a Chat session.
 *
 * The SPA runs the Authorization-Code + PKCE flow entirely in the browser
 * (@hanzo/iam), then POSTs the resulting `{ accessToken, idToken }` here. We:
 *   1. JWKS-validate the id_token against hanzo.id (issuer + signature + expiry),
 *   2. reconcile the Mongo User by `sub` (openidId), creating/migrating as needed,
 *   3. issue the EXISTING Chat session — refresh cookie + Mongo `Session` +
 *      `token_provider=chat` + a Chat JWT (via `setAuthTokens`), so reload-persist
 *      and the 401->refresh interceptor keep working byte-identically to before,
 *   4. persist the id_token/access_token server-side (`req.session.openidTokens`)
 *      so downstream on-behalf-of cloud calls run as this hanzo.id principal.
 *
 * The IAM tokens are NEVER stored in a browser-readable place: the Chat JWT is the
 * only bearer returned to the SPA; the id_token stays server-side for OBO.
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
 * made the token look like the place to read it. This file did exactly that and
 * got '' for every user, so hanzo.chat drew a monogram for people who have a
 * photo — the account it was measured on has one, stored in IAM as a
 * `data:image/jpeg;base64,…` URI.
 *
 * The token is the wrong home for it regardless of the bug: the avatar is an
 * inline data URI, and a JWT that carries one is a JWT nobody can put in a
 * cookie. Large, optional profile data belongs at userinfo — which is where the
 * server-initiated `openidStrategy` has always read it from.
 *
 * Best-effort by construction: a login must never fail because a photo could
 * not be fetched, so every error resolves to '' and the caller falls back to the
 * initials it already draws.
 */
async function pictureFromUserinfo(accessToken) {
  const issuer = (process.env.OPENID_ISSUER || '').replace(/\/+$/, '');
  if (!accessToken || !issuer) {
    return '';
  }
  try {
    // ASK DISCOVERY WHERE USERINFO IS. Guessing the path costs a silent failure:
    // `/v1/iam/userinfo` looks right and 404s — the real endpoint is
    // `/v1/iam/oauth/userinfo`. Since every error here resolves to '' so a login
    // can never fail over a photo, a wrong path would have been invisible
    // forever, which is the worst way to be wrong. The issuer publishes the
    // answer, so read it instead of hardcoding a second guess.
    const meta = await fetch(`${issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!meta.ok) {
      logger.debug(`[iamSession] discovery ${meta.status} — no photo this login`);
      return '';
    }
    const endpoint = claimStr((await meta.json())?.userinfo_endpoint);
    if (!endpoint) {
      logger.debug('[iamSession] issuer publishes no userinfo_endpoint — no photo this login');
      return '';
    }
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.debug(`[iamSession] userinfo ${res.status} — no photo this login`);
      return '';
    }
    const info = await res.json();
    return claimStr(info?.picture);
  } catch (err) {
    logger.debug('[iamSession] userinfo unreachable — no photo this login:', err?.message || err);
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
 * Reconcile (find/create/migrate) the Mongo User for a verified IAM identity.
 * Mirrors the openid strategy's `openidId = sub` model and the `findOpenIDUser`
 * migration path, minus the userinfo/avatar enrichment (not needed for login/OBO;
 * cloud derives the tenant org from the forwarded id_token's `owner` claim).
 * @param {Record<string, any>} claims - verified IAM token claims
 * @param {string} [picture] - the photo from userinfo, '' when there is none
 * @returns {Promise<import('@hanzochat/data-schemas').IUser>}
 */
async function reconcileUser(claims, picture = '') {
  const openidId = claimStr(claims.sub);
  const email = claimStr(claims.email);
  const { user: found, error } = await findOpenIDUser({
    findUser,
    openidId,
    email: email || undefined,
    idOnTheSource: claimStr(claims.oid) || undefined,
    strategyName: 'iamSessionBridge',
  });
  if (error) {
    const err = new Error(error);
    err.status = 403;
    throw err;
  }

  const username =
    claimStr(claims.preferred_username) ||
    claimStr(claims.username) ||
    (email ? email.split('@')[0] : openidId);
  const name = fullNameFromClaims(claims);
  // The profile photo, stored as-is so the account menu can render it
  // (resolveIdentity reads `avatar`). It comes from USERINFO — see
  // pictureFromUserinfo above for why the id_token is not the place, and was
  // never carrying it. `claims.picture` stays as the fallback so this keeps
  // working unchanged if IAM ever does put a (URL-shaped) photo in the token.
  //
  // A manually-set avatar (`manual=true`) is the user's own choice and is never
  // overwritten by the one from the identity provider.
  const avatar = picture || claimStr(claims.picture);
  const organization =
    claimStr(claims.owner) || claimStr(claims.organization) || claimStr(claims.org) || '';
  const project = claimStr(claims.project) || '';
  const groups = Array.isArray(claims.groups) ? claims.groups : [];

  if (found) {
    const update = { provider: 'openid', openidId };
    if (name && name !== found.name) {
      update.name = name;
    }
    if (username && username !== found.username) {
      update.username = username;
    }
    if (organization) {
      update.organization = organization;
    }
    if (project) {
      update.project = project;
    }
    if (groups.length) {
      update.groups = groups;
    }
    if (avatar && !found.avatar?.includes('manual=true') && avatar !== found.avatar) {
      update.avatar = avatar;
    }
    if (!found.role) {
      update.role = SystemRoles.USER;
    }
    const updated = await updateUser(found._id, update);
    return updated || found;
  }

  const appConfig = await getAppConfig();
  const isFirstRegisteredUser = (await countUsers()) === 0;
  const balanceConfig = getBalanceConfig(appConfig);
  const created = await createUser(
    {
      provider: 'openid',
      openidId,
      username,
      email: email || '',
      emailVerified: claims.email_verified === true,
      name,
      avatar,
      idOnTheSource: claimStr(claims.oid),
      organization,
      project,
      groups,
      role: isFirstRegisteredUser ? SystemRoles.ADMIN : SystemRoles.USER,
    },
    balanceConfig,
    true,
    true,
  );
  return created;
}

/**
 * POST /v1/chat/auth/iam/session — exchange an IAM SPA token for a Chat session.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function iamSessionController(req, res) {
  try {
    const { accessToken, idToken } = req.body || {};
    if (!idToken && !accessToken) {
      return res.status(400).json({ message: 'idToken or accessToken is required' });
    }

    /**
     * The OIDC id_token is the identity assertion (JWKS-validatable, `aud` = the
     * client the SPA authenticated with). Fall back to the access token only when
     * no id_token was issued.
     */
    const identityToken = idToken || accessToken;
    let claims;
    try {
      claims = await verifyIamToken(identityToken);
    } catch (err) {
      logger.warn('[iamSession] IAM token verification failed:', err?.message || err);
      return res.status(401).json({ message: 'invalid IAM token' });
    }
    if (!claims?.sub) {
      return res.status(401).json({ message: 'IAM token missing subject' });
    }

    // The photo is a userinfo read, so it needs the ACCESS token — an id_token is
    // an identity assertion, not a credential the userinfo endpoint accepts. When
    // the SPA sent only an id_token there is nothing to ask with, and the login
    // proceeds without a photo rather than failing.
    const picture = await pictureFromUserinfo(accessToken);
    const user = await reconcileUser(claims, picture);
    if (!user?._id) {
      return res.status(401).json({ message: 'user reconciliation failed' });
    }

    /** Ban check against the resolved principal (mirrors the OAuth handler). */
    req.user = user;
    await checkBan(req, res);
    if (req.banned) {
      return;
    }

    /**
     * Issue the Chat session exactly as a local login does: refresh cookie +
     * Mongo Session + `token_provider=chat` + the Chat JWT. This keeps the
     * 401->refresh interceptor and reload-persist working unchanged.
     */
    const token = await setAuthTokens(user._id, res);

    /**
     * Persist the IAM tokens server-side for on-behalf-of cloud calls. The
     * decoupled default: no OIDC refresh credential is bound (session refreshes
     * via the Chat JWT cookie), so this only carries the bearer material that
     * `resolveTenantBearer` forwards. Best-effort — never break login.
     */
    try {
      persistOpenIDTokensToSession(req, {
        access_token: accessToken || idToken,
        id_token: idToken,
      });
    } catch (persistErr) {
      logger.warn('[iamSession] failed to persist IAM tokens for on-behalf-of:', persistErr);
    }

    const safeUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete safeUser.password;
    delete safeUser.totpSecret;
    delete safeUser.backupCodes;

    logger.info(
      `[iamSession] session established openidId: ${claimStr(claims.sub)} | email: ${safeUser.email}`,
    );
    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    logger.error('[iamSession] error establishing session:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'session bridge failed' });
  }
}

module.exports = { iamSessionController, reconcileUser, pictureFromUserinfo };
