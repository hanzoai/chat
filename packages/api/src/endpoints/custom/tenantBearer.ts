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
 * It is the token the caller presented on THIS request, already verified against
 * IAM's JWKS before any route ran. Forwarding what they presented is what makes
 * the principal cloud bills the same principal that authenticated here — not by
 * a check that keeps the two in step, but because there is only one token.
 *
 * That identity is why nothing needs binding, storing or renewing. A stored
 * copy could name a different user than the caller, outlive the session it came
 * from, or be missing when the call is made; the request's own bearer can do
 * none of those, and it is fresh exactly as often as the caller's is.
 */

/** The request shape this resolver needs — a subset of the Express request. */
export interface TenantBearerRequest {
  user?: {
    guest?: boolean;
  } | null;
  headers?: {
    authorization?: string;
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
 * The caller's IAM bearer, or null when they have none.
 *
 * A guest is nobody — they presented no credential and there is no org to bill —
 * so there is nothing to forward and the caller falls back to its own path.
 */
export function resolveTenantBearer(req: TenantBearerRequest): string | null {
  if (req.user?.guest === true) {
    return null;
  }
  const header = req.headers?.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
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
