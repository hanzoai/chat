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
 * @returns {Promise<import('@hanzochat/data-schemas').IUser>}
 */
async function reconcileUser(claims) {
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
  // The profile photo. hanzo.id issues it as the `picture` claim; stored as-is
  // so the account menu can render it (resolveIdentity reads `avatar`). A
  // manually-set avatar (`manual=true`) is the user's own choice and is never
  // overwritten by the one from the token.
  const avatar = claimStr(claims.picture);
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

    const user = await reconcileUser(claims);
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

module.exports = { iamSessionController, reconcileUser };
