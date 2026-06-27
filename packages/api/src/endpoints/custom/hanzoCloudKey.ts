import { logger } from '@librechat/data-schemas';

/**
 * Per-user Hanzo Cloud (hk-) key resolution — the core of hanzo.chat per-user
 * billing.
 *
 * Each authenticated chat request must be billed to the LOGGED-IN USER'S OWN
 * Hanzo Cloud account, not a single shared key. Every IAM user has exactly one
 * `hk-…` Cloud API key on their IAM record (`User.AccessKey`); the cloud gateway
 * (api.hanzo.ai) debits that key's org commerce balance and returns 402 when the
 * org runs out. So forwarding the right per-user key === correct per-user billing
 * automatically.
 *
 * This module resolves (and, on first use, mints) that key from IAM by the
 * authenticated user's `organization` (IAM owner) + email, then caches it. It is
 * the SINGLE source of truth for "which hk- key bills this request"; the shared
 * `${HANZO_API_KEY}` is only the (capped, non-exempt) fallback for the
 * unauthenticated guest path.
 *
 * Identity: IAM resolves a user by `owner=<org>&email=<email>` (a Casdoor user's
 * `name` is not necessarily their email, and an email-only / UUID lookup does not
 * resolve), mirroring the console's `iamGetUserByOrgEmail`. Confidential-client
 * Basic auth (the chat OIDC client id + secret) authorizes the lookup/mint.
 *
 * FAIL CLOSED: callers MUST treat a `null` return for an authenticated user as
 * "cannot bill this user" and block — never fall back to the shared key, or an
 * IAM hiccup would silently route an authed user's spend onto the shared org.
 */

type IamUserRecord = {
  owner?: string;
  name?: string;
  accessKey?: string;
};

/** Minimal shape of the authenticated request user we need to bill. */
export type HanzoBillingUser = {
  id?: string;
  email?: string | null;
  organization?: string | null;
  provider?: string;
  /** Guest (anonymous preview) users carry this and must NOT get a per-user key. */
  guest?: boolean;
};

const KEY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const IAM_TIMEOUT_MS = 5000;

/** Per-user hk- key cache: cacheKey (user id|email) -> { key, expiresAt }. */
const keyCache = new Map<string, { key: string; expiresAt: number }>();

function truthy(value?: string): boolean {
  return (value ?? '').toString().trim().toLowerCase() === 'true';
}

/** IAM base URL — prefer an in-cluster override, else the OIDC issuer. */
function iamBaseUrl(): string {
  const base =
    process.env.IAM_INTERNAL_URL ||
    process.env.IAM_SERVER_URL ||
    process.env.OPENID_ISSUER ||
    '';
  return base.replace(/\/+$/, '');
}

function iamClientId(): string {
  return process.env.IAM_CLIENT_ID || process.env.OPENID_CLIENT_ID || '';
}

function iamClientSecret(): string {
  return process.env.IAM_CLIENT_SECRET || process.env.OPENID_CLIENT_SECRET || '';
}

/**
 * Whether per-user hk- billing is enabled AND fully configured. When false,
 * `resolveHanzoCloudKey` returns null and the shared key is used (legacy).
 */
export function isHanzoPerUserKeyEnabled(): boolean {
  return (
    truthy(process.env.HANZO_PER_USER_KEY) &&
    Boolean(iamBaseUrl()) &&
    Boolean(iamClientId()) &&
    Boolean(iamClientSecret())
  );
}

function basicAuthHeader(): string {
  const raw = `${iamClientId()}:${iamClientSecret()}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

/**
 * Single IAM HTTP primitive (confidential-client Basic auth, `/v1/iam/*` JSON
 * API). Throws on transport error / non-ok status so callers fail closed.
 */
async function iamRequest(
  path: string,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'GET',
): Promise<{ status?: string; data?: IamUserRecord & { accessKey?: string } }> {
  const url = new URL(`${iamBaseUrl()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') {
      url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IAM_TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`IAM ${method} ${path} returned ${resp.status}`);
    }
    return (await resp.json()) as { status?: string; data?: IamUserRecord };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Resolve the authoritative IAM record (owner/name/accessKey) by org + email. */
async function getIamUserByOrgEmail(
  owner: string,
  email: string,
): Promise<IamUserRecord | null> {
  const res = await iamRequest('/v1/iam/get-user', {
    owner,
    email: email.toLowerCase(),
  });
  if (res.status !== 'ok' || !res.data?.owner || !res.data?.name) {
    return null;
  }
  return res.data;
}

/** Mint (create) the per-user hk- key for an IAM sub ("owner/name"). */
async function mintUserKey(sub: string): Promise<string | null> {
  const res = await iamRequest('/v1/iam/mint-user-keys', { id: sub }, 'POST');
  if (res.status !== 'ok' || !res.data?.accessKey) {
    return null;
  }
  return res.data.accessKey;
}

/**
 * Resolve the authenticated user's own hk- Cloud API key, minting one on first
 * use if the IAM record has none. Returns null when per-user billing is
 * disabled/unconfigured, the user is a guest / has no email, or IAM cannot be
 * reached (caller FAILS CLOSED on null for an authenticated user).
 */
export async function resolveHanzoCloudKey(
  user?: HanzoBillingUser | null,
): Promise<string | null> {
  if (!isHanzoPerUserKeyEnabled()) {
    return null;
  }
  if (!user || user.guest) {
    return null;
  }
  const email = (user.email ?? '').toString().toLowerCase();
  if (!email) {
    return null;
  }

  const cacheKey = user.id || email;
  const cached = keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const defaultOrg = process.env.HANZO_DEFAULT_ORG || 'hanzo';
  const owner = (user.organization ?? '').toString().trim() || defaultOrg;

  try {
    let record = await getIamUserByOrgEmail(owner, email);
    // A user whose stored org is stale/missing may live in the default org.
    if (!record && owner !== defaultOrg) {
      record = await getIamUserByOrgEmail(defaultOrg, email);
    }
    if (!record?.owner || !record?.name) {
      logger.warn('[hanzoCloudKey] No IAM user for billing identity', {
        owner,
        email,
      });
      return null;
    }

    // Single authoritative identity: stamp the REAL billing org (record.owner)
    // back onto req.user. The OIDC-stored `organization` can be the Casdoor
    // super-org "admin" for some users, which is NOT where their hk- key bills —
    // so the downstream Commerce balance gate must use this resolved owner, not
    // the login-time value. This keeps the key and the gate on ONE org.
    try {
      user.organization = record.owner;
    } catch {
      /* req.user may be a frozen/lean doc — non-fatal; gate still has gateway as backstop */
    }

    let key = (record.accessKey ?? '').trim();
    if (!key) {
      // Mint on first chat — the key is theirs going forward.
      key = (await mintUserKey(`${record.owner}/${record.name}`)) ?? '';
    }
    if (!key) {
      logger.error('[hanzoCloudKey] Failed to resolve/mint hk- key', {
        sub: `${record.owner}/${record.name}`,
      });
      return null;
    }

    keyCache.set(cacheKey, { key, expiresAt: Date.now() + KEY_TTL_MS });
    return key;
  } catch (err) {
    logger.error('[hanzoCloudKey] IAM lookup failed (failing closed)', {
      owner,
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Test-only: clear the in-process key cache. */
export function _clearHanzoKeyCache(): void {
  keyCache.clear();
}
