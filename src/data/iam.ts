/**
 * The one IAM client.
 *
 * It lives apart from `session.tsx` because two things need it and neither may
 * build its own: the session drives the sign-in, and `ai.ts` hands it to the SDK
 * as the token source. A second instance would hold a second PKCE verifier in a
 * second storage slot, and whichever one did not start the round trip would fail
 * to finish it.
 *
 * Built on first use rather than at import, because it reads `window`.
 */
import { IAM } from '@hanzo/iam'

import { brand, clientId } from '~/brand'
import { callbackPath, loginPath } from '~/data/api'

/**
 * What a session asks for.
 *
 * `offline_access` is what makes a session outlive its access token. IAM issues
 * a refresh token only when asked, and without one the only way past an expiry
 * is a full redirect to the issuer — a page navigation in the middle of whatever
 * someone was typing.
 */
const scope = 'openid profile email offline_access'

let engine: IAM | null = null

export const iam = (): IAM => {
  if (engine) return engine

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // On localhost against hanzo.id, the allowlisted redirect is a FIXED
  // http://localhost:3000/auth/callback under hanzo-app — we do not own that
  // allowlist, so the port is theirs to dictate.
  //
  // Against a LOCAL cloud we own it, and the app rarely has :3000 free, so the
  // redirect follows the origin actually being served. Register that URI on the
  // local issuer's hanzo-app; an issuer cannot redirect to a URI it never heard.
  const localIssuer =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:|$|\/)/.test(brand.issuer)
  const base = localIssuer ? window.location.origin : 'http://localhost:3000'
  const effectiveClientId = isLocal ? 'hanzo-app' : clientId
  const redirectUri = isLocal
    ? `${base}${callbackPath}`
    : `${window.location.origin}${callbackPath}`
  const postLogoutRedirectUri = isLocal
    ? `${base}${loginPath}?redirect=false`
    : `${window.location.origin}${loginPath}?redirect=false`

  engine = new IAM({
    serverUrl: brand.issuer,
    clientId: effectiveClientId,
    organization: brand.org,
    redirectUri,
    postLogoutRedirectUri,
    scope,
  })

  return engine
}
