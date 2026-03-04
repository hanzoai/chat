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
   * Check user's balance. Returns cached result if fresh, triggers async
   * refresh if stale, synchronous fetch on cache miss. Fails open on error.
   *
   * @param {string} userId - Commerce user ID (e.g. "hanzo/alice")
   * @returns {Promise<{sufficient: boolean, available: number}>}
   */
  async checkBalance(userId) {
    const cached = this._balanceCache.get(userId);
    const now = Date.now();

    if (cached) {
      const age = now - cached.fetchedAt;
      if (age < this.cacheTTL) {
        return cached.data;
      }
      // Stale: serve cached, refresh async
      if (!cached.refreshing) {
        cached.refreshing = true;
        this._fetchBalance(userId).catch(() => {});
      }
      return cached.data;
    }

    // Cache miss: synchronous fetch
    return this._fetchBalance(userId);
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
   * Create a trial credit grant for a new user.
   *
   * @param {string} userId - Commerce user ID
   * @param {number} amountCents - Grant amount in cents (e.g. 500 = $5)
   * @param {number} expiryDays - Days until expiry
   * @param {string[]} [eligibility] - Meter IDs (empty = all meters)
   * @returns {Promise<Object|null>} Grant object or null on failure
   */
  async createTrialGrant(userId, amountCents, expiryDays, eligibility = []) {
    try {
      const expiresIn = `${expiryDays * 24}h`;
      const resp = await this._request('POST', '/api/v1/billing/credit-grants', {
        userId,
        name: 'Trial Credit',
        amountCents,
        currency: 'usd',
        expiresIn,
        priority: 100, // Trial burns before purchased (200)
        eligibility,
        tags: 'trial',
      });
      return resp;
    } catch (err) {
      logger.error('[CommerceClient] Failed to create trial grant', err);
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
        `/api/v1/billing/credit-balance/breakdown?userId=${encodeURIComponent(userId)}`,
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

  async _fetchBalance(userId) {
    try {
      const resp = await this._request(
        'GET',
        `/api/v1/billing/balance?user=${encodeURIComponent(userId)}&currency=usd`,
      );
      const data = {
        sufficient: (resp.available || 0) > 0,
        available: resp.available || 0,
      };
      this._balanceCache.set(userId, {
        data,
        fetchedAt: Date.now(),
        refreshing: false,
      });
      return data;
    } catch (err) {
      logger.warn('[CommerceClient] Balance check failed, failing open', { userId, error: err.message });
      // Fail open
      return { sufficient: true, available: 0 };
    }
  }

  async _fetchTier(userId, tierName) {
    try {
      let url = `/api/v1/billing/tier-check?user=${encodeURIComponent(userId)}`;
      if (tierName) {
        url += `&tier=${encodeURIComponent(tierName)}`;
      }
      const resp = await this._request('GET', url);
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
        await this._request('POST', '/api/v1/billing/usage', usage);
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
  async _request(method, path, body) {
    const url = `${this.endpoint}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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
