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
 * `frame-src` stays at `'self'`. It once also listed hanzo.id, for `signinSilent()`
 * — a `prompt=none` authorize in a HIDDEN IFRAME. That flow is gone: hanzo.id
 * answers `frame-ancestors 'none'` + `X-Frame-Options: DENY` on every route
 * including `/login/oauth/authorize`, so the IdP refuses to be framed by anyone
 * and no relying-party CSP can change that. Chat now signs in by interactive
 * redirect only, and renews the forwarded bearer server-side
 * (services/iamBearerRefresh.js `currentBearer`) — which is what actually keeps a
 * signed-in session answering. Do not re-add the origin without a flow that uses it.
 *
 * `frame-ancestors 'self'` (with `X-Frame-Options: SAMEORIGIN`) refuses framing by
 * any other origin; same-origin is needed for the silent.mp3 audio unlock iframe.
 * Both framing directives are now closed to every third party: nothing may embed
 * US, and we embed nobody.
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
  // 'self' keeps the same-origin silent.mp3 audio-unlock iframe. Nothing else.
  "frame-src 'self'",
  "frame-ancestors 'self'",
].join('; ');

module.exports = { contentSecurityPolicy };
