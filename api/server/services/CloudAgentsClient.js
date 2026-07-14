const { logger } = require('@librechat/data-schemas');

/**
 * The canonical cloud agent registry is Hanzo Cloud `/v1/agents`
 * (github.com/hanzoai/cloud, clients/agents). This client lets chat's backend
 * RUN a caller's own cloud agents from the chat thread, without ever exposing
 * the user's IAM token to the browser.
 *
 * Tenant isolation is NOT enforced here — it is enforced BY cloud. This client
 * forwards the caller's own hanzo.id bearer (the OpenID id_token) as
 * `Authorization: Bearer <token>`; cloud's SanitizeIdentity middleware
 * (HIP-0026) validates it and pins `X-Org-Id` from the verified `owner` claim,
 * stripping any client-supplied copy. So a chat user can only ever reach their
 * OWN org's agents — chat is not trusted to assert the org, and this client
 * deliberately never sends an org header for cloud to trust.
 *
 * This is NOT an open proxy: the base host is fixed from env, the only paths are
 * the three hardcoded templates below, and the agent name is validated against
 * cloud's own handle grammar before it is ever placed in a URL (no traversal,
 * no SSRF).
 *
 * @example
 *   const client = getCloudAgentsClient();
 *   const { agents } = await client.list(userBearer);
 *   const run = await client.run(userBearer, 'researcher', 'summarize Q3');
 */

/**
 * Cloud's org-unique agent handle AND URL path segment. Mirrors nameRE in
 * cloud/clients/agents/agents.go exactly — the traversal/SSRF guard at chat's
 * boundary, so a malformed name is rejected before it reaches the network.
 */
const AGENT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Matches cloud's maxInput (128 KiB) so oversized input fails fast, locally. */
const MAX_INPUT = 128 * 1024;

/**
 * Cap the upstream body we buffer. A run's output is bounded; refusing a runaway
 * or malformed response keeps one request from pinning the shared backend's
 * memory. Availability defense — the proxy is otherwise unbounded by size.
 */
const MAX_RESPONSE = 4 * 1024 * 1024;

/**
 * Process-wide ceiling on concurrent in-flight calls to cloud. Each call holds a
 * socket + timer for up to `timeout` ms; without a cap, a burst (many users, or
 * one user within the per-user rate window) could saturate the shared backend.
 * Fail fast (503) past the ceiling rather than queue and hold resources.
 */
const MAX_CONCURRENT = Number(process.env.CLOUD_AGENT_MAX_CONCURRENT) || 50;

/**
 * HTTP timeout (ms) for a cloud call. A run is a real chat completion — a
 * zen5-mini answer routinely takes ~25-30s and larger models/prompts longer — so
 * the old 30s default aborted mid-run, surfacing as an in-UI 502 even though the
 * cloud run finished and recorded. 180s gives real runs headroom; override with
 * CLOUD_AGENT_TIMEOUT. (List/get are fast; the ceiling only matters for /run.)
 */
const DEFAULT_TIMEOUT = Number(process.env.CLOUD_AGENT_TIMEOUT) || 180000;

class CloudAgentsClient {
  /**
   * @param {Object} opts
   * @param {string} opts.endpoint  - Cloud base URL (e.g. https://api.hanzo.ai)
   * @param {number} [opts.timeout] - HTTP timeout in ms (default DEFAULT_TIMEOUT,
   *   180s; a run is a real chat completion so it needs far more headroom than a
   *   metadata read — 30s aborted long runs mid-flight)
   * @param {number} [opts.maxConcurrent] - process-wide in-flight ceiling
   */
  constructor({ endpoint, timeout = DEFAULT_TIMEOUT, maxConcurrent = MAX_CONCURRENT }) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxConcurrent = maxConcurrent;
    this._inFlight = 0;
  }

  /**
   * Validate an agent name against cloud's handle grammar. Throws a tagged error
   * (status 400) on failure so the route surfaces an honest client error.
   * @param {string} name
   * @returns {string} the trimmed, validated name
   */
  static requireValidName(name) {
    const n = (name ?? '').toString().trim();
    if (!AGENT_NAME_RE.test(n)) {
      const err = new Error('invalid agent name');
      err.status = 400;
      throw err;
    }
    return n;
  }

  /**
   * List the caller's cloud agents.
   * @param {string} bearer - the caller's hanzo.id id_token
   * @param {string} [activeOrg] - the member's selected working org (X-Org-Id)
   * @returns {Promise<{agents: Array}>}
   */
  async list(bearer, activeOrg) {
    return this._request('GET', '/v1/agents', bearer, undefined, activeOrg);
  }

  /**
   * Get one cloud agent (detail + recent runs).
   * @param {string} bearer
   * @param {string} name
   * @param {string} [activeOrg] - the member's selected working org (X-Org-Id)
   * @returns {Promise<Object>} cloud's AgentDetail
   */
  async get(bearer, name, activeOrg) {
    const n = CloudAgentsClient.requireValidName(name);
    return this._request('GET', `/v1/agents/${encodeURIComponent(n)}`, bearer, undefined, activeOrg);
  }

  /**
   * Run one cloud agent with a caller-supplied input. Records a real run in
   * cloud and returns the RunResult (status "ok" with output, or an upstream
   * failure surfaced honestly).
   * @param {string} bearer
   * @param {string} name
   * @param {string} input
   * @param {string} [activeOrg] - the member's selected working org (X-Org-Id)
   * @returns {Promise<Object>} cloud's RunResult
   */
  async run(bearer, name, input, activeOrg) {
    const n = CloudAgentsClient.requireValidName(name);
    const body = (input ?? '').toString();
    // Byte length, not UTF-16 units — matches cloud's byte-based maxInput exactly
    // (a multibyte string can be ~3x its .length in UTF-8).
    if (Buffer.byteLength(body, 'utf8') > MAX_INPUT) {
      const err = new Error('input too large');
      err.status = 400;
      throw err;
    }
    return this._request(
      'POST',
      `/v1/agents/${encodeURIComponent(n)}/run`,
      bearer,
      { input: body },
      activeOrg,
    );
  }

  /**
   * @param {string} method
   * @param {string} path   - one of the fixed templates above
   * @param {string} bearer - the caller's hanzo.id bearer (required)
   * @param {Object} [body]
   * @param {string} [activeOrg] - the member's selected working org; forwarded as
   *   `X-Org-Id` for cloud to validate against the bearer's membership (HIP-0026)
   * @returns {Promise<Object>}
   */
  async _request(method, path, bearer, body, activeOrg) {
    if (!bearer) {
      // Fail secure: never fall back to an ambient/service credential — that
      // would run as the wrong principal. Absent a user bearer, deny.
      const err = new Error('missing user credential');
      err.status = 401;
      throw err;
    }

    if (this._inFlight >= this.maxConcurrent) {
      // Shed load: the shared backend is saturated with upstream calls. Refusing
      // here protects every other tenant — availability over this one request.
      const err = new Error('cloud agents temporarily saturated');
      err.status = 503;
      throw err;
    }

    const url = `${this.endpoint}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    };
    if (activeOrg) {
      headers['X-Org-Id'] = activeOrg;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    this._inFlight += 1;

    try {
      const opts = { method, headers, signal: controller.signal };
      if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
      }

      const resp = await fetch(url, opts);
      const text = await this._readCapped(resp, controller);
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { error: text };
      }

      if (!resp.ok) {
        // A run that executed but failed upstream comes back as 502 with a run
        // body (status/error) — preserve that so the caller can surface it.
        const err = new Error(`cloud ${method} ${path} returned ${resp.status}`);
        err.status = resp.status;
        err.body = json;
        throw err;
      }
      return json;
    } finally {
      clearTimeout(timeoutId);
      this._inFlight -= 1;
    }
  }

  /**
   * Read the response body but never buffer more than MAX_RESPONSE bytes. Rejects
   * a declared-oversize body up front (Content-Length) and aborts a chunked
   * stream the instant it exceeds the cap, so a runaway upstream cannot exhaust
   * memory. Falls back to `.text()` when the runtime/mocks expose no stream body.
   * @param {Response} resp
   * @param {AbortController} controller
   * @returns {Promise<string>}
   */
  async _readCapped(resp, controller) {
    const declared = Number(resp.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > MAX_RESPONSE) {
      controller.abort();
      const err = new Error('cloud response too large');
      err.status = 502;
      throw err;
    }

    const reader = resp.body?.getReader?.();
    if (!reader) {
      return resp.text().catch(() => '');
    }

    const decoder = new TextDecoder();
    let out = '';
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE) {
        await reader.cancel();
        controller.abort();
        const err = new Error('cloud response too large');
        err.status = 502;
        throw err;
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
  }
}

/**
 * Singleton, initialized lazily from env. Returns null when cloud agents are not
 * configured for this deployment (the route then answers with a disabled state).
 */
let _instance;

function getCloudAgentsClient() {
  if (_instance !== undefined) {
    return _instance;
  }

  // Dedicated var first; fall back to the same host the rest of chat already
  // talks to (api.hanzo.ai), derived from OPENAI_BASE_URL by stripping the /v1.
  let endpoint = (process.env.HANZO_CLOUD_URL || '').trim();
  if (!endpoint) {
    const base = (process.env.OPENAI_BASE_URL || '').trim();
    if (base) {
      endpoint = base.replace(/\/v1\/?$/, '');
    }
  }

  if (!endpoint) {
    _instance = null;
    return null;
  }

  _instance = new CloudAgentsClient({ endpoint });
  logger.info('[CloudAgentsClient] Initialized', { endpoint });
  return _instance;
}

/** Reset the memoized singleton (tests only). */
function _resetCloudAgentsClient() {
  _instance = undefined;
}

module.exports = {
  CloudAgentsClient,
  getCloudAgentsClient,
  _resetCloudAgentsClient,
  AGENT_NAME_RE,
  MAX_INPUT,
  MAX_RESPONSE,
  MAX_CONCURRENT,
};
