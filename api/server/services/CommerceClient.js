const { logger } = require('@hanzochat/data-schemas');

/**
 * CommerceClient is chat's READ-ONLY window into Hanzo Commerce (balance, tier,
 * credit breakdown). It NEVER writes: the single debit for an AI spend is the
 * cloud gateway's (api.hanzo.ai debits the forwarded per-user hk- key), and the
 * only credit (the first-chat starter grant) is issued by resolveHanzoCloudKey
 * (packages/api) at the request boundary. Two writers to one ledger is the
 * double-debit anti-pattern — so chat stays a reader. Pattern follows cloud-api's
 * filter_balance.go:
 *   - 30s TTL balance/tier cache with async refresh
 *   - Reads fail CLOSED (the money gate); tier/breakdown fail open
 *
 * @example
 *   const client = new CommerceClient({
 *     endpoint: 'http://commerce.hanzo.svc:8001',
 *     token: process.env.COMMERCE_API_TOKEN || process.env.COMMERCE_TOKEN,
 *   });
 *   const { sufficient } = await client.checkBalance('hanzo/alice');
 */
/**
 * The org self-serve signups land in. Mirrors `account.SignupOrg` in cloud, which
 * is the authority; it is named here so the subject below can be spelled without
 * a round trip.
 */
const SIGNUP_ORG = 'hanzo';

/**
 * The Commerce account a signed-in caller spends from.
 *
 * Most orgs POOL: one balance for the tenant, every member draws on it, and the
 * subject is the bare org. The signup org is the exception, and it is the one
 * that matters here because it is where self-serve strangers land: the account
 * sitting beside its members is the PLATFORM's own, so a member is their own
 * account (`<org>/<name>`) and never the pool. Reading the pool there reports one
 * person's balance to everybody who ever signed up.
 *
 * Cloud decides this with `account.Payer` and debits what it decides
 * (apps/principal/wallet.go). This is that rule spelled where chat reads it, so
 * the number shown is the number that pays.
 *
 * @param {{organization?: string, username?: string}} user
 * @returns {string} the billing subject, or '' when the caller has no org
 */
function billingSubject(user) {
  const org = (user?.organization ?? '').toString().trim();
  if (!org) {
    return '';
  }
  const name = (user?.username ?? '').toString().trim();
  return org.toLowerCase() === SIGNUP_ORG && name ? `${org}/${name}` : org;
}

class CommerceClient {
  /**
   * @param {Object} opts
   * @param {string} opts.endpoint  - Commerce base URL (e.g. http://commerce.hanzo.svc:8001)
   * @param {string} [opts.token]   - Bearer token for admin endpoints
   * @param {number} [opts.timeout] - HTTP timeout in ms (default 5000)
   * @param {number} [opts.cacheTTL] - Cache TTL in ms (default 30000)
   */
  constructor({ endpoint, token, timeout = 5000, cacheTTL = 30000 }) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.token = token;
    this.timeout = timeout;
    this.cacheTTL = cacheTTL;

    // Balance cache: userId -> { data, fetchedAt, refreshing }
    this._balanceCache = new Map();
    // Tier cache: userId -> { data, fetchedAt, refreshing }
    this._tierCache = new Map();

    // Cache cleanup every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanupCaches(), 300000);
  }

  /**
   * The Commerce namespace (X-Org-Id) for a billing subject. The subject is
   * object.BillingSubject(owner, name): "owner/name" (per-user) or "owner"
   * (pooled) — so the namespace is always the part before the first "/", or the
   * whole subject. Deriving it here keeps every read/write scoped to the right
   * tenant without callers having to thread the org separately.
   *
   * @param {string} subject
   * @returns {string}
   */
  _namespaceOf(subject) {
    const s = (subject ?? '').toString();
    const i = s.indexOf('/');
    return i > 0 ? s.slice(0, i) : s;
  }

  /**
   * Check a billing subject's balance. Returns cached result if fresh, triggers
   * async refresh if stale, synchronous fetch on cache miss. Fails CLOSED (the
   * cold-miss fetch throws) so the caller blocks rather than bleeding.
   *
   * @param {string} subject - Commerce billing subject (e.g. "hanzo/alice@gmail.com")
   * @returns {Promise<{sufficient: boolean, available: number}>}
   */
  async checkBalance(subject) {
    const cached = this._balanceCache.get(subject);
    const now = Date.now();

    if (cached) {
      const age = now - cached.fetchedAt;
      if (age < this.cacheTTL) {
        return cached.data;
      }
      // Stale: serve cached, refresh async
      if (!cached.refreshing) {
        cached.refreshing = true;
        this._fetchBalance(subject).catch(() => {});
      }
      return cached.data;
    }

    // Cache miss: synchronous fetch
    return this._fetchBalance(subject);
  }

  /**
   * Get tier configuration for a user.
   *
   * @param {string} userId
   * @param {string} [tierName] - Optional tier override
   * @returns {Promise<{name: string, displayName: string, allowedModels: string[], maxAgents: number}|null>}
   */
  async getTierConfig(userId, tierName) {
    const cached = this._tierCache.get(userId);
    const now = Date.now();

    if (cached) {
      const age = now - cached.fetchedAt;
      if (age < this.cacheTTL * 10) {
        // Tier changes rarely, cache 5min
        return cached.data;
      }
      if (!cached.refreshing) {
        cached.refreshing = true;
        this._fetchTier(userId, tierName).catch(() => {});
      }
      return cached.data;
    }

    return this._fetchTier(userId, tierName);
  }

  /**
   * Check if a model is allowed for a user's tier.
   *
   * @param {string} userId
   * @param {string} model
   * @returns {Promise<{allowed: boolean, tier: string, allowedModels: string[]}>}
   */
  async isModelAllowed(userId, model) {
    const tier = await this.getTierConfig(userId);
    if (!tier) {
      return { allowed: true, tier: 'unknown', allowedModels: ['*'] };
    }

    const allowed =
      tier.allowedModels.includes('*') ||
      tier.allowedModels.some((prefix) => model.startsWith(prefix));

    return { allowed, tier: tier.name, allowedModels: tier.allowedModels };
  }

  /**
   * Get credit balance breakdown by tag (trial vs purchased).
   *
   * @param {string} userId
   * @returns {Promise<{trial: {cents: number, expiresAt?: string}, paid: {cents: number}, total: {cents: number}}|null>}
   */
  async getCreditBreakdown(userId) {
    try {
      const resp = await this._request(
        'GET',
        `/v1/billing/credit-balance/breakdown?userId=${encodeURIComponent(userId)}`,
        undefined,
        this._namespaceOf(userId),
      );
      const breakdown = resp.breakdown || {};
      return {
        trial: breakdown.trial || { cents: 0 },
        paid: breakdown.purchased || { cents: 0 },
        total: resp.total || { cents: 0 },
      };
    } catch (err) {
      logger.error('[CommerceClient] Failed to get credit breakdown', err);
      return null;
    }
  }

  // ── Internal methods ──

  async _fetchBalance(subject) {
    // FAIL CLOSED: this is the money gate. On error we THROW so the caller blocks
    // the request rather than letting unfunded/unknown users spend. The cache
    // (serve-stale on refresh) smooths transient blips for already-known users;
    // only a cold miss + error propagates. `subject` is the billing account
    // (object.BillingSubject) used as `?user=`; the namespace (X-Org-Id) is
    // its org prefix — matching the gateway's keying so chat reads the SAME
    // account the gateway debits.
    const resp = await this._request(
      'GET',
      `/v1/billing/balance?user=${encodeURIComponent(subject)}&currency=usd`,
      undefined,
      this._namespaceOf(subject),
    );
    const data = {
      sufficient: (resp.available || 0) > 0,
      available: resp.available || 0,
    };
    this._balanceCache.set(subject, {
      data,
      fetchedAt: Date.now(),
      refreshing: false,
    });
    return data;
  }

  async _fetchTier(userId, tierName) {
    try {
      let url = `/v1/billing/tier-check?user=${encodeURIComponent(userId)}`;
      if (tierName) {
        url += `&tier=${encodeURIComponent(tierName)}`;
      }
      const resp = await this._request('GET', url, undefined, this._namespaceOf(userId));
      const tier = resp.tier || null;
      if (tier) {
        this._tierCache.set(userId, {
          data: tier,
          fetchedAt: Date.now(),
          refreshing: false,
        });
      }
      return tier;
    } catch (err) {
      logger.warn('[CommerceClient] Tier check failed, failing open', { userId, error: err.message });
      return null; // Caller treats null as "allow all"
    }
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {Object} [body]
   * @returns {Promise<Object>}
   */
  async _request(method, path, body, orgId) {
    const url = `${this.endpoint}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Scope the service-token call to the tenant's commerce namespace so reads/
    // writes are correctly per-org (not the service token's default namespace).
    //
    // The header is `X-Org-Id`. It was `X-Hanzo-Org`, which Commerce does not
    // read on the service-token path — so it answered 401 "sign in to view
    // billing" to EVERY call, identically to sending no credential at all.
    // That made the failure invisible: `checkBalance` throws, the controller's
    // documented fall-through to the local ledger runs, and production does not
    // fund that ledger (`balance.enabled=false`), so the read 404s and the
    // client — which only renders a balance when one is present — showed a
    // funded account nothing at all. Two deliberate fallbacks in a row turned a
    // wrong header name into silence. `ask.js` and `CloudAgentsClient` already
    // send `X-Org-Id`; this was the one caller that did not.
    if (orgId) {
      headers['X-Org-Id'] = orgId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const opts = {
        method,
        headers,
        signal: controller.signal,
      };
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

  _cleanupCaches() {
    const now = Date.now();
    const maxAge = this.cacheTTL * 20; // 10 minutes

    for (const [key, entry] of this._balanceCache) {
      if (now - entry.fetchedAt > maxAge) {
        this._balanceCache.delete(key);
      }
    }
    for (const [key, entry] of this._tierCache) {
      if (now - entry.fetchedAt > maxAge) {
        this._tierCache.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
  }
}

/**
 * Singleton Commerce client instance. Initialized lazily from env vars.
 * Returns null if Commerce integration is not configured.
 */
let _instance = null;

function getCommerceClient() {
  if (_instance !== undefined && _instance !== null) {
    return _instance;
  }

  const endpoint =
    process.env.COMMERCE_API_URL ||
    process.env.COMMERCE_ENDPOINT ||
    '';

  if (!endpoint) {
    _instance = null;
    return null;
  }

  const token = process.env.COMMERCE_API_TOKEN || process.env.COMMERCE_TOKEN || '';

  _instance = new CommerceClient({ endpoint, token });
  logger.info('[CommerceClient] Initialized', { endpoint });
  return _instance;
}

module.exports = { CommerceClient, getCommerceClient, billingSubject };
