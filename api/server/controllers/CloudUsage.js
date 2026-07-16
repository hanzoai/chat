const { logger } = require('@librechat/data-schemas');
const { resolveTenantBearer } = require('@hanzochat/api');

/**
 * Canonical cloud AI usage for the caller's org. Proxies cloud's
 * `GET /v1/get-cloud-usages` (hanzoai/ai controllers/cloud_usage.go) — the ONE
 * usage read every Hanzo surface shares (console / app / billing), assembled from the
 * `hanzo.cloud_usage` ledger into the `CloudUsageOverview` shape (totals + prior-period
 * deltas, an evenly-spaced series, spend-by-model, and the recent-activity feed). The
 * user's hanzo.id bearer is resolved server-side and forwarded on-behalf-of; cloud
 * validates it and scopes to the caller's OWN org (same trust model as CloudAgentsClient
 * / RoutingDefaults). The token never reaches the browser.
 *
 * This is a SEPARATE concern from the Mongo `/v1/chat/usage` tab (LibreChat's own token-
 * credit accounting): the client renders this beside it with the shared @hanzo/usage
 * shape — nothing is re-derived here.
 *
 * Honest by construction:
 *   - not configured (no HANZO_CLOUD_URL) or no hanzo.id bearer -> 200 {enabled:false}
 *     (the client hides the cloud-usage section; the Mongo usage tab is unaffected).
 *   - success -> 200 with the unwrapped CloudUsageOverview (the client normalizes and
 *     renders it with @hanzo/usage — never fabricated spend, tokens, or trend).
 *   - an unreachable / erroring ledger -> the upstream status + {error} so the client
 *     renders an honest "usage unavailable", NOT zeros.
 */

/** HTTP timeout (ms) for the ledger read. Override with CLOUD_USAGE_TIMEOUT. */
const TIMEOUT = Number(process.env.CLOUD_USAGE_TIMEOUT) || 10000;

/** Cloud's base host, resolved the same way the sibling proxies (RoutingDefaults,
 *  CloudAgentsClient) do: explicit HANZO_CLOUD_URL, else derived from OPENAI_BASE_URL. */
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

const RANGES = ['24h', '7d', '30d'];

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(Math.max(n, min), max);
};

/** Validated passthrough — the client controls range + paging, but the proxy never
 *  forwards arbitrary params to the upstream ledger. */
function usageQuery(req) {
  const q = new URLSearchParams();
  const range = String(req.query.range || '7d');
  q.set('range', RANGES.includes(range) ? range : '7d');
  q.set('topModels', String(clampInt(req.query.topModels, 6, 1, 20)));
  q.set('activityType', req.query.activityType === 'inference' ? 'inference' : 'all');
  q.set('activityLimit', String(clampInt(req.query.activityLimit, 20, 1, 100)));
  return q.toString();
}

async function cloudUsageController(req, res) {
  const endpoint = cloudEndpoint();
  const bearer = resolveTenantBearer(req);
  if (!endpoint || !bearer) {
    return res.status(200).json({ enabled: false });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(`${endpoint}/v1/get-cloud-usages?${usageQuery(req)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
      signal: controller.signal,
    });
    const body = await resp.json().catch(() => undefined);
    if (!resp.ok || (body && body.status === 'error')) {
      const message = (body && (body.msg || body.error)) || `cloud usage unavailable (${resp.status})`;
      return res.status(resp.ok ? 502 : resp.status).json({ error: message });
    }
    // Unwrap the cloud {status,msg,data} envelope (tolerate a bare overview).
    const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
    return res.status(200).json(data ?? {});
  } catch (err) {
    logger.warn('[cloudUsage] proxy failed', { message: err?.message });
    return res.status(502).json({ error: 'cloud usage unavailable' });
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = cloudUsageController;
