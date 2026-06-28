const { logger } = require('@librechat/data-schemas');

/**
 * CommerceClient provides a cached, fail-open interface to Hanzo Commerce
 * billing APIs. Pattern follows cloud-api's filter_balance.go:
 *   - 30s TTL balance/tier cache with async refresh
 *   - Fire-and-forget usage recording queue
 *   - All errors fail-open (local MongoDB is authoritative fallback)
 *
 * @example
 *   const client = new CommerceClient({
 *     endpoint: 'http://commerce.hanzo.svc:8001',
 *     token: process.env.COMMERCE_API_TOKEN || process.env.COMMERCE_TOKEN,
 *   });
 *   const { sufficient } = await client.checkBalance('hanzo/alice');
 */
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

    // Usage recording queue
    this._usageQueue = [];
    this._usageFlushing = false;
    this._usageFlushInterval = setInterval(() => this._flushUsageQueue(), 5000);

    // Cache cleanup every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanupCaches(), 300000);
  }

  /**
   * The Commerce namespace (X-Hanzo-Org) for a billing subject. The subject is
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
   * Enqueue usage recording (fire-and-forget). Commerce calls BurnCredits
   * internally to burn trial grants first, then paid.
   *
   * @param {Object} usage
   * @param {string} usage.userId
   * @param {string} usage.model
   * @param {number} usage.promptTokens
   * @param {number} usage.completionTokens
   * @param {number} usage.amountCents - Cost in cents
   */
  recordUsage({ userId, model, promptTokens, completionTokens, amountCents }) {
    this._usageQueue.push({
      user: userId,
      model,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      amount: amountCents || 0,
      currency: 'usd',
      status: 'completed',
    });

    // Flush immediately if queue is large
    if (this._usageQueue.length >= 50) {
      this._flushUsageQueue().catch(() => {});
    }
  }

  /**
   * Ensure a subject has the one-time $5 starter credit, idempotently.
   *
   * This posts to /v1/billing/grant-starter, which creates a real Deposit
   * transaction (tag "starter-credit", $5, 30-day expiry) — so it nets into
   * GET /v1/billing/balance, the account the gateway gate reads and debits.
   * (NOT a credit-grant record: those live in a separate ledger the balance
   * endpoint does not read, so they would never unblock the gate.)
   *
   * Idempotent + race-safe in Commerce (tag-deduped inside a transaction): safe
   * to call on every first chat; duplicate/concurrent calls never double-grant.
   *
   * @param {string} subject - Commerce billing subject (e.g. "hanzo/alice@gmail.com")
   * @returns {Promise<{granted: boolean}|null>} or null on failure
   */
  async grantStarter(subject) {
    try {
      const resp = await this._request(
        'POST',
        '/v1/billing/grant-starter',
        { user: subject, trigger: 'chat_first_use' },
        this._namespaceOf(subject),
      );
      return resp;
    } catch (err) {
      logger.error('[CommerceClient] Failed to ensure starter credit', err);
      return null;
    }
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
    // (object.BillingSubject) used as `?user=`; the namespace (X-Hanzo-Org) is
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

  async _flushUsageQueue() {
    if (this._usageFlushing || this._usageQueue.length === 0) {
      return;
    }

    this._usageFlushing = true;
    const batch = this._usageQueue.splice(0, 100);

    for (const usage of batch) {
      try {
        await this._request('POST', '/v1/billing/usage', usage);
      } catch (err) {
        logger.warn('[CommerceClient] Usage recording failed', {
          user: usage.user,
          model: usage.model,
          error: err.message,
        });
        // Don't retry — usage is also tracked locally in MongoDB
      }
    }

    this._usageFlushing = false;
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
    if (orgId) {
      headers['X-Hanzo-Org'] = orgId;
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
    clearInterval(this._usageFlushInterval);
    clearInterval(this._cleanupInterval);
    // Flush remaining usage
    this._flushUsageQueue().catch(() => {});
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

module.exports = { CommerceClient, getCommerceClient };
