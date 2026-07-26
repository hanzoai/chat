/**
 * The one Content-Security-Policy served with every response.
 *
 * `connect-src` must include the IAM origin (hanzo.id): login is browser PKCE,
 * so the SPA itself fetches `/.well-known/openid-configuration` and POSTs the
 * code to `/v1/iam/oauth/token`. Without it a visitor signs in at hanzo.id,
 * returns to `/auth/callback`, and the exchange dies on CSP ("IAM session bridge
 * failed: Failed to fetch") — login silently never completes. hanzo.id is NOT
 * covered by `*.hanzo.ai`.
 *
 * `frame-ancestors 'self'` (with `X-Frame-Options: SAMEORIGIN`) still refuses
 * framing by any other origin; same-origin is needed for the silent.mp3 audio
 * unlock iframe.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // No analytics.hanzo.ai: the last page tag that loaded a script from it is gone.
  // Telemetry is the @hanzo/event client, which only ever POSTs (connect-src).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hanzo.app https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://hanzo.id https://hanzo.app https://*.hanzo.ai https://*.hanzo.chat wss://*.hanzo.chat https://static.cloudflareinsights.com https://cloudflareinsights.com",
  "frame-ancestors 'self'",
].join('; ');

module.exports = { contentSecurityPolicy };
