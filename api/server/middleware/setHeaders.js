/**
 * Allowed origins for CORS on SSE streams.
 * Falls back to DOMAIN_CLIENT if set, otherwise allows the request origin
 * only when it matches a known Hanzo domain pattern.
 */
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || process.env.DOMAIN_CLIENT || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const HANZO_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?(hanzo\.(ai|chat|bot|id|team|app|build)|lux\.(chat|network|id)|zoo\.(ngo|network))$/;

function resolveOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return undefined;
  }
  // Explicit allowlist takes priority.
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  // Fallback: match known Hanzo domains.
  if (HANZO_ORIGIN_RE.test(origin)) {
    return origin;
  }
  return undefined;
}

function setHeaders(req, res, next) {
  const allowedOrigin = resolveOrigin(req);
  const headers = {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(200, headers);
  next();
}

module.exports = setHeaders;
