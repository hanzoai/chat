import jwt from 'jsonwebtoken';
import { logger } from '@hanzochat/data-schemas';

/**
 * The ONE way chat forwards a signed-in user's Hanzo IAM bearer to cloud
 * (api.hanzo.ai). Both the chat-completion path (custom/initialize.ts) and the
 * cloud-agents path (server/routes/agents/cloud.js) resolve the bearer through
 * THIS function — there is no second bearer-resolution anywhere.
 *
 * The bearer IS the credential AND the billing identity: cloud validates the JWT
 * (JWKS sig + issuer + audience + exp), pins the tenant org from the verified
 * `owner` claim, and meters the org's shared plan then PAYG. chat holds NO shared
 * key and mints NO per-user key — see AUTH_BILLING_CONTRACT.md in hanzoai/cloud.
 *
 * The token lives server-side (the OIDC session store, httpOnly cookie fallback)
 * and is NEVER returned to the browser.
 */

/** The request shape this resolver needs — a subset of the Express request. */
export interface TenantBearerRequest {
  user?: {
    provider?: string;
    openidId?: string;
  } | null;
  session?: {
    openidTokens?: {
      idToken?: string;
      accessToken?: string;
    };
  };
  headers?: {
    cookie?: string;
  };
}

/** Parse a Cookie header into a flat map (no dependency; RFC 6265 name=value pairs). */
function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {
    return out;
  }
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    if (key && out[key] === undefined) {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return out;
}

/**
 * Is this token safe to forward on-behalf-of `user`? Fail-secure gates, ALL
 * mandatory — the function only ever REMOVES a token from consideration:
 *  - Decodable JWT: hanzo.id (the only cloud IdP) always issues JWTs; an
 *    opaque/garbage token cannot be principal-bound, so it is never forwarded.
 *  - Principal binding (MANDATORY): the token must NAME the authenticated user
 *    (`sub === user.openidId`). If the binding cannot be ASSERTED — no
 *    `openidId`, no `sub`, or a mismatch — the token is NOT forwarded. This keeps
 *    "forwarded principal == req.user" true by construction, closing the
 *    credential-mixing confused deputy (a session/cookie carrying a different
 *    user's token) with no fail-open when binding data is absent.
 *  - Expiry: never forward a token past its own `exp`.
 *
 * Decode-only (no signature verification): cloud performs the authoritative
 * JWKS + claim validation over the SAME claims, so it runs as exactly this
 * `sub`. A forged/tampered token gains nothing here — changing `sub` fails the
 * binding; an intact `sub` is rejected by cloud on signature.
 */
export function isForwardableToken(token: string | undefined, openidId?: string): boolean {
  if (!token || !openidId) {
    return false;
  }
  const claims = jwt.decode(token);
  if (!claims || typeof claims !== 'object') {
    return false;
  }
  const c = claims as { sub?: string; exp?: number };
  if (c.sub !== openidId) {
    return false;
  }
  if (typeof c.exp === 'number' && c.exp * 1000 <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * Resolve the caller's forwardable Hanzo IAM bearer, or null.
 *
 * Keyed off the VALIDATED principal (`req.user.provider === 'openid'` — the
 * authoritative user loaded by requireJwtAuth), NOT any cookie. A local user
 * never carries a hanzo.id token, so a stale OpenID session in the browser can
 * never be forwarded under a local identity.
 *
 * Every candidate — session first, then the httpOnly cookie fallback; id_token
 * preferred, access_token second — must pass `isForwardableToken`. Returns null
 * for an honest 401, never a wrong-principal / expired / unbound token.
 */
export function resolveTenantBearer(req: TenantBearerRequest): string | null {
  const user = req.user;
  if (!user || user.provider !== 'openid') {
    return null;
  }

  const session = req.session?.openidTokens;
  const cookies = parseCookies(req.headers?.cookie);

  const idToken = session?.idToken || cookies.openid_id_token;
  if (isForwardableToken(idToken, user.openidId)) {
    return idToken as string;
  }

  const accessToken = session?.accessToken || cookies.openid_access_token;
  if (isForwardableToken(accessToken, user.openidId)) {
    return accessToken as string;
  }

  logger.debug('[tenantBearer] no forwardable IAM bearer for principal', {
    openidId: user.openidId,
  });
  return null;
}

/**
 * The active org a member has switched to, or null for their home org.
 *
 * A multi-org member selects a working org in the account menu; the switch is
 * pinned in the `hanzo_active_org` cookie (set server-side by
 * `/v1/chat/user/active-org`, which admits ONLY an org in the caller's own
 * membership set). Chat forwards it as `X-Org-Id` on the on-behalf-of calls to
 * cloud so the completion (and its billing) lands on the chosen org.
 *
 * This value is a HINT, not an authority: the gateway (HIP-0026) re-derives the
 * tenant from the verified JWT and admits a sent `X-Org-Id` only when it is in
 * that member's set, pinning to `owner` otherwise. So a forged cookie can never
 * reach an org the caller isn't a member of — cloud is the enforcer, this is the
 * selection. Returns null (home org, no header) when unset.
 */
export function resolveActiveOrg(req: TenantBearerRequest): string | null {
  const org = parseCookies(req.headers?.cookie).hanzo_active_org;
  return org ? org : null;
}

/**
 * The IAM org that owns this request's data — the member's selected working org,
 * else their home org.
 *
 * `resolveActiveOrg` answers "did they switch?" and is null for the home org,
 * because cloud pins `owner` itself when no `X-Org-Id` is sent. Storage has no
 * such enforcer downstream, so it needs the org SPELLED OUT — hence this one
 * composition, next to the resolver it extends.
 *
 * There is no separate tenant identity in chat: the tenant IS the IAM org
 * (`user.organization`, projected from the verified `owner` claim). Nothing here
 * invents or persists a tenant id; a caller with no IAM org resolves to null and
 * keeps the historical un-scoped behaviour.
 */
export function resolveRequestOrg(
  req: TenantBearerRequest & { user?: { organization?: string } | null },
): string | null {
  return resolveActiveOrg(req) ?? req.user?.organization ?? null;
}

/**
 * The endpoint-config sentinel that opts a custom endpoint into IAM-bearer
 * forwarding. An endpoint whose `apiKey` is this value bills the signed-in user's
 * own org via their forwarded IAM token (the canonical Hanzo Cloud path) instead
 * of any static key. This reuses Chat's existing OIDC-token placeholder name
 * so chat.yaml stays self-documenting.
 */
export const OPENID_BEARER_SENTINEL = '{{CHAT_OPENID_TOKEN}}';
