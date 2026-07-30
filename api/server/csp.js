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
 * `frame-src` must include hanzo.id too, and for a DIFFERENT reason than
 * `connect-src`. The two directives govern opposite mechanisms and having only the
 * first is what made silent SSO inert: `@hanzo/iam`'s `signinSilent()` does
 * `prompt=none` in a HIDDEN IFRAME (browser.js: `document.createElement("iframe")`),
 * not a fetch. With no `frame-src` the policy fell back to `default-src 'self'`, so
 * every silent re-auth died in the browser with "Framing 'https://hanzo.id/'
 * violates the following Content Security Policy directive: default-src 'self'".
 * The consequence was not a visible error — it was a signed-in customer silently
 * rendering as anonymous, then being handed a 2-message guest trial, on a surface
 * whose whole point is that their own account funds it. Measured live in a headless
 * browser against hanzo.chat; `connect-src` already listed hanzo.id, which is why
 * this read as configured when it was not.
 *
 * ⚠️ THIS DIRECTIVE IS NECESSARY AND NOT SUFFICIENT, and saying so here is the
 * point — do not read it as "silent SSO works now". Framing is refused by BOTH
 * ends, and only the relying-party end is fixable from this repo. Measured against
 * live hanzo.id, including its `/login/oauth/authorize` (HTTP 200):
 *     content-security-policy: frame-ancestors 'none'
 *     x-frame-options: DENY
 * So the IdP refuses to be framed by anyone, and `signinSilent()` stays blocked
 * until hanzo.id itself changes — `frame-ancestors` must name the relying-party
 * origins, and `X-Frame-Options: DENY` must be DROPPED rather than edited, because
 * XFO has no allow-list (only DENY / SAMEORIGIN) and a stale XFO overrides the
 * newer directive in browsers that honour it. That is a change to the shared
 * identity provider's clickjacking posture for every surface, so it is an owner
 * decision and deliberately not made here.
 *
 * The honest state, then: this end is correct and the flow is still blocked at the
 * IdP. Chat does not depend on it for correctness — the bearer now renews
 * server-side (services/iamBearerRefresh.js `currentBearer`), which is what
 * actually keeps a signed-in session answering.
 *
 * `frame-ancestors 'self'` (with `X-Frame-Options: SAMEORIGIN`) still refuses
 * framing by any other origin; same-origin is needed for the silent.mp3 audio
 * unlock iframe. Note the asymmetry is deliberate and is the whole security story
 * here: `frame-src` widens what THIS page may embed (our own IdP, for a flow the
 * IdP itself gates), `frame-ancestors` stays closed so nothing may embed US.
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
  // 'self' keeps the same-origin silent.mp3 audio-unlock iframe; hanzo.id is the
  // prompt=none silent-SSO iframe. Nothing else may be framed.
  "frame-src 'self' https://hanzo.id",
  "frame-ancestors 'self'",
].join('; ');

module.exports = { contentSecurityPolicy };
