const { logger } = require('@hanzochat/data-schemas');
const { resolveTenantBearer } = require('@hanzochat/api');

/**
 * Server-driven auto-routing defaults for the caller's org. Proxies cloud's
 * `GET /v1/ai/router/defaults` (authenticated, org-scoped) so ops can enable
 * routing per-default in production from admin.hanzo.ai. The user's hanzo.id
 * bearer is resolved server-side and forwarded on-behalf-of — cloud validates it
 * and scopes to the caller's own org (same trust model as CloudAgentsClient); the
 * token never reaches the browser.
 *
 * Fail-soft is the whole contract: on a missing bearer, an older cloud-api (404),
 * a network error, a non-ok wrapper, or a malformed body, we answer 200 with
 * `{ available: false }` so the client behaves exactly as today (local preference
 * only) with no crash and no spinner block.
 */

/** HTTP timeout (ms) for the metadata read. Fast endpoint; keep it snappy. */
const TIMEOUT = Number(process.env.ROUTING_DEFAULTS_TIMEOUT) || 5000;

/** The "unknown/absent" answer — the client maps this to today's local-only behavior. */
const ABSENT = { available: false };

/** Resolve cloud's base host the same way the rest of chat's proxies do. */
function cloudEndpoint() {
  const explicit = (process.env.HANZO_CLOUD_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  const base = (process.env.OPENAI_BASE_URL || '').trim();
  if (base) {
    return base.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return '';
}

async function routingDefaultsController(req, res) {
  const endpoint = cloudEndpoint();
  const bearer = resolveTenantBearer(req);
  if (!endpoint || !bearer) {
    return res.status(200).json(ABSENT);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(`${endpoint}/v1/ai/router/defaults`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
      signal: controller.signal,
    });
    if (!resp.ok) {
      return res.status(200).json(ABSENT);
    }
    const body = await resp.json();
    const data = body?.status === 'ok' ? body?.data : undefined;
    if (!data || typeof data !== 'object') {
      return res.status(200).json(ABSENT);
    }
    return res.status(200).json({
      available: true,
      auto_routing_active: data.auto_routing_active === true,
      default_session_routing: data.default_session_routing === true,
    });
  } catch (err) {
    logger.debug('[routingDefaults] fail-soft', { message: err?.message });
    return res.status(200).json(ABSENT);
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = routingDefaultsController;
