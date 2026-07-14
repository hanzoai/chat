/**
 * The active org a multi-org member has switched to, or null for their home org.
 *
 * A member selects a working org in the account menu; the choice is pinned in the
 * httpOnly `hanzo_active_org` cookie (set server-side by
 * `POST /v1/chat/user/active-org`, which admits ONLY an org in the caller's own
 * membership set). Chat forwards it as `X-Org-Id` on the on-behalf-of calls to
 * cloud (api.hanzo.ai) — both the chat-completion path (custom/initialize.ts) and
 * the cloud-agents path (server/routes/agents/cloud.js) — so the completion, and
 * its billing, lands on the chosen org.
 *
 * This value is a HINT, not an authority: the gateway (HIP-0026) re-derives the
 * tenant from the verified credential and admits a sent `X-Org-Id` only when it
 * is in that member's set, pinning to `owner` otherwise. A forged cookie can
 * never reach an org the caller isn't a member of — cloud is the enforcer, this
 * is the selection. Returns null (home org, no header) when unset.
 */

/** The name of the cookie that pins a member's selected working org. */
export const ACTIVE_ORG_COOKIE = 'hanzo_active_org';

/** The request shape this resolver needs — a subset of the Express request. */
export interface ActiveOrgRequest {
  headers?: {
    cookie?: string;
  };
}

/** Parse a Cookie header into a flat map (RFC 6265 name=value pairs, no dependency). */
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
 * Resolve the active org the caller has selected, or null for their home org.
 * Reads only the `hanzo_active_org` cookie — the gateway validates it against the
 * caller's membership, so an unset/forged value simply falls back to the home org.
 */
export function resolveActiveOrg(req: ActiveOrgRequest): string | null {
  const org = parseCookies(req.headers?.cookie)[ACTIVE_ORG_COOKIE];
  return org ? org : null;
}
