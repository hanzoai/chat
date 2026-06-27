const { logger } = require('@librechat/data-schemas');
const { getMultiplier } = require('~/models/tx');

/**
 * CommerceClient is the IAM-native, multi-tenant transport to Hanzo Commerce
 * billing. Every call carries the LOGGED-IN USER'S hanzo.id IAM access token
 * (a real JWT) as `Authorization: Bearer <jwt>` — never a static service token.
 * Commerce's EdgeAuth validates the JWT against the IAM JWKS and derives the
 * tenant/org FROM the token (claims.owner), so reads/writes are scoped to the
 * caller's own org with no chance of cross-tenant leakage.
 *
 * The money read (`getMyBalance`) FAILS CLOSED: any failure to confirm a
 * sufficient balance throws, and the caller (BaseClient.checkBalance via
 * balanceMethods) refuses the AI call rather than serving unmetered tokens.
 *
 * Canonical commerce endpoints (all amounts in CENTS, identity from the JWT):
 *   - GET  /v1/billing/me/balance   → { balance, holds, available }
 *   - POST /v1/billing/me/welcome   → idempotent $5 starter credit (deposit)
 *   - POST /v1/billing/usage        → withdraw (decrements the org balance)
 *
 * @example
 *   const client = getCommerceClient();
 *   const { available } = await client.getMyBalance(getIamToken(req), org);
 */
class CommerceClient {
  /**
   * @param {Object} opts
   * @param {string} opts.endpoint   - Commerce base URL (e.g. http://commerce.hanzo.svc:8001)
   * @param {number} [opts.timeout]  - HTTP timeout in ms (default 5000)
   * @param {number} [opts.cacheTTL] - Balance cache TTL in ms (default 10000)
   */
  constructor({ endpoint, timeout = 5000, cacheTTL = 10000 }) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.timeout = timeout;
    this.cacheTTL = cacheTTL;
    /** Balance cache: orgKey -> { data, fetchedAt } (short TTL, invalidated on spend) */
    this._balanceCache = new Map();
  }

  /**
   * Read the caller's org balance. Identity is taken ENTIRELY from the IAM JWT
   * (commerce derives the org from claims.owner); there is no user/org query
   * param to forge. FAILS CLOSED: throws on a missing token or any commerce
   * error so the caller blocks the request.
   *
   * @param {string} token  - The user's hanzo.id IAM access token (JWT)
   * @param {string} [orgKey] - Org slug used only as the cache key
   * @returns {Promise<{available: number, balance: number, holds: number}>} cents
   */
  async getMyBalance(token, orgKey) {
    if (!token) {
      throw new Error('CommerceClient.getMyBalance: missing IAM token');
    }
    const cached = orgKey && this._balanceCache.get(orgKey);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTTL) {
      return cached.data;
    }
    const resp = await this._request('GET', '/v1/billing/me/balance?currency=usd', { token });
    const data = {
      available: Number(resp.available) || 0,
      balance: Number(resp.balance) || 0,
      holds: Number(resp.holds) || 0,
    };
    if (orgKey) {
      this._balanceCache.set(orgKey, { data, fetchedAt: Date.now() });
    }
    return data;
  }

  /**
   * Grant the idempotent $5 welcome credit to the caller's org under their IAM
   * identity. Safe to call repeatedly — commerce dedupes by the starter-credit
   * tag and returns granted:false if it already exists. Best-effort (never
   * throws): a failed grant must not crash login or the balance gate.
   *
   * @param {string} token - The user's hanzo.id IAM access token (JWT)
   * @returns {Promise<Object|null>}
   */
  async grantWelcome(token) {
    if (!token) {
      return null;
    }
    try {
      const resp = await this._request('POST', '/v1/billing/me/welcome', { token });
      this._balanceCache.clear();
      return resp;
    } catch (err) {
      logger.error('[CommerceClient] welcome credit grant failed', err);
      return null;
    }
  }

  /**
   * Record a completed AI call as a withdraw that DECREMENTS the org balance.
   * Awaited by spendTokens so the decrement is durable and the next pre-flight
   * balance check sees it. Best-effort against commerce errors — the local
   * MongoDB ledger is the redundant record, and the fail-closed pre-flight gate
   * prevents runaway while commerce is unreachable.
   *
   * @param {string} token
   * @param {Object} usage
   * @param {string} usage.org             - Billing org slug (== balance key)
   * @param {string} usage.model
   * @param {number} usage.promptTokens
   * @param {number} usage.completionTokens
   * @param {number} usage.amountCents      - Cost in cents (> 0)
   * @param {string} [usage.provider]
   * @param {string} [usage.requestId]
   */
  async recordUsage(
    token,
    { org, model, promptTokens, completionTokens, amountCents, provider, requestId },
  ) {
    if (!token || !org || !(amountCents > 0)) {
      return;
    }
    await this._request('POST', '/v1/billing/usage', {
      token,
      body: {
        user: org,
        amount: Math.round(amountCents),
        currency: 'usd',
        model,
        provider,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens: (promptTokens || 0) + (completionTokens || 0),
        requestId,
        status: 'completed',
      },
    });
    // Next pre-flight read must reflect the spend immediately.
    this._balanceCache.delete(org);
  }

  /**
   * Credit balance breakdown (trial vs paid) for the billing UI. Best-effort.
   *
   * @param {string} token
   * @returns {Promise<{trial: {cents: number}, paid: {cents: number}, total: {cents: number}}|null>}
   */
  async getCreditBreakdown(token) {
    if (!token) {
      return null;
    }
    try {
      // userId is locked to the caller's org by commerce EdgeAuth; value is a placeholder.
      const resp = await this._request('GET', '/v1/billing/credit-balance/breakdown?userId=me', {
        token,
      });
      const breakdown = resp.breakdown || {};
      return {
        trial: breakdown['starter-credit'] || breakdown.trial || { cents: 0 },
        paid: breakdown.purchased || breakdown.paid || { cents: 0 },
        total: resp.total || { cents: 0 },
      };
    } catch (err) {
      logger.warn('[CommerceClient] credit breakdown failed', { error: err.message });
      return null;
    }
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {Object} [opts]
   * @param {string} [opts.token] - User IAM JWT for Authorization: Bearer
   * @param {Object} [opts.body]
   * @returns {Promise<Object>}
   */
  async _request(method, path, { token, body } = {}) {
    const url = `${this.endpoint}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const opts = { method, headers, signal: controller.signal };
      if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
      }
      const resp = await fetch(url, opts);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Commerce ${method} ${path} returned ${resp.status}: ${text}`);
      }
      return await resp.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Extract the logged-in user's hanzo.id IAM access token (a JWT) from the
 * request. Populated by the OpenID JWT strategy when OPENID_REUSE_TOKENS is
 * enabled (req.user.federatedTokens). The id_token is preferred: it is always
 * a JWKS-signed JWT with the chat client_id as audience and carries the
 * `owner` (org) claim commerce keys billing on. Returns null when no IAM
 * identity is present — callers MUST treat that as "cannot confirm balance"
 * and fail closed.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getIamToken(req) {
  const ft = req?.user?.federatedTokens;
  return ft?.id_token || ft?.access_token || null;
}

/**
 * The caller's billing org slug (lowercased to match commerce's org.Name key).
 * Sourced from the IAM `owner` claim persisted on the user at OIDC login.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
function getBillingOrg(req) {
  return (req?.user?.organization ?? '').toString().trim().toLowerCase();
}

// 1,000,000 tokenCredits = $1.00 USD = 100 cents → 10,000 credits = 1 cent.
const CREDITS_PER_CENT = 10000;

/**
 * Cost of a completed call in commerce cents, using the SAME multiplier table
 * the local ledger uses (models/tx) so commerce mirrors the local charge.
 * Rounds up so any non-zero usage decrements at least one cent.
 */
function computeUsageCents({
  model,
  endpoint,
  endpointTokenConfig,
  promptTokens,
  completionTokens,
}) {
  const p = Math.max(promptTokens || 0, 0);
  const c = Math.max(completionTokens || 0, 0);
  const promptMult = getMultiplier({ tokenType: 'prompt', model, endpoint, endpointTokenConfig });
  const completionMult = getMultiplier({
    tokenType: 'completion',
    model,
    endpoint,
    endpointTokenConfig,
  });
  const credits = p * promptMult + c * completionMult;
  return credits > 0 ? Math.ceil(credits / CREDITS_PER_CENT) : 0;
}

/**
 * Decrement the user's commerce balance for a completed AI call. Called from
 * spendTokens with the request so the IAM token + org are threaded per-request.
 * No-ops cleanly when commerce is unconfigured or there is no IAM identity
 * (the pre-flight gate has already fail-closed in that case).
 *
 * @param {Object} args
 * @param {import('express').Request} args.req
 * @param {string} args.model
 * @param {string} [args.endpoint]
 * @param {Object} [args.endpointTokenConfig]
 * @param {number} args.promptTokens
 * @param {number} args.completionTokens
 */
async function recordCommerceSpend({
  req,
  model,
  endpoint,
  endpointTokenConfig,
  promptTokens,
  completionTokens,
}) {
  const client = getCommerceClient();
  if (!client) {
    return;
  }
  const token = getIamToken(req);
  const org = getBillingOrg(req);
  if (!token || !org) {
    return;
  }
  const amountCents = computeUsageCents({
    model,
    endpoint,
    endpointTokenConfig,
    promptTokens,
    completionTokens,
  });
  if (amountCents <= 0) {
    return;
  }
  try {
    await client.recordUsage(token, {
      org,
      model,
      promptTokens,
      completionTokens,
      amountCents,
    });
  } catch (err) {
    logger.warn('[CommerceClient] usage decrement failed (kept in local ledger)', {
      org,
      error: err.message,
    });
  }
}

/**
 * Singleton Commerce client. Initialized lazily from COMMERCE_API_URL.
 * Returns null when Commerce integration is not configured.
 */
let _instance = null;

function getCommerceClient() {
  if (_instance) {
    return _instance;
  }
  const endpoint = process.env.COMMERCE_API_URL || process.env.COMMERCE_ENDPOINT || '';
  if (!endpoint) {
    return null;
  }
  _instance = new CommerceClient({ endpoint });
  logger.info('[CommerceClient] Initialized (IAM-native, per-request user JWT)', { endpoint });
  return _instance;
}

module.exports = {
  CommerceClient,
  getCommerceClient,
  getIamToken,
  getBillingOrg,
  computeUsageCents,
  recordCommerceSpend,
};
