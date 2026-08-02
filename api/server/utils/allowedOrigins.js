/**
 * The origins allowed to make credentialed cross-origin requests.
 *
 * ONE list, matched EXACTLY, read from configuration. This module knows the
 * mechanism; it does not know our domains — those are values and they live in
 * the deployment (`CORS_ALLOWED_ORIGINS`), so adding a console is a config
 * change rather than a release.
 *
 * WHY EXACT AND NEVER A PATTERN. This replaced
 *
 *   /^https:\/\/([a-z0-9-]+\.)?(hanzo\.(ai|chat|...)|...)$/
 *
 * used together with `credentials: true`. That optional label matches ANY
 * subdomain, so every `*.hanzo.ai` host — and every customer-published
 * `<slug>.hanzo.app` site — could read a signed-in visitor's response. Origins
 * under one registrable domain are same-site, so `SameSite=Lax` does not
 * withhold the session cookie between them: the pattern quietly deleted the
 * same-origin boundary between our own subdomains, turning an XSS anywhere on
 * hanzo.ai into a read of this app's authenticated responses.
 *
 * A pattern also cannot express the distinction that matters — `hanzo.app`
 * serves CUSTOMER-PUBLISHED sites, so it is not first-party at all, yet it is
 * indistinguishable from a console under a suffix rule.
 */

/** Parse a comma-separated origin list. Exported for tests. */
function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(
  process.env.CORS_ALLOWED_ORIGINS || process.env.DOMAIN_CLIENT,
);

/**
 * The origin to echo back, or undefined to send no CORS headers at all.
 *
 * Undefined is the safe answer: a browser that receives no
 * `Access-Control-Allow-Origin` discards the response, which is what we want
 * for an origin we do not recognise.
 *
 * @param {string|undefined} origin - the request's `Origin` header
 * @param {string[]} [list] - override, for tests
 * @returns {string|undefined}
 */
function resolveAllowedOrigin(origin, list = allowedOrigins) {
  if (!origin) {
    return undefined;
  }
  return list.includes(origin) ? origin : undefined;
}

module.exports = { resolveAllowedOrigin, parseOrigins, allowedOrigins };
