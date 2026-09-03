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

import { brand, clientId } from '../brand'
import { callbackPath, loginPath } from './api'

/**
 * What a session asks for.
 *
 * `offline_access` is what makes a session outlive its access token. IAM issues
 * a refresh token only when asked, and without one the only way past an expiry
 * is a full redirect to the issuer — a page navigation in the middle of whatever
 * someone was typing.
 */
const scope = 'openid profile email offline_access'

/**
 * Which IAM answers.
 *
 * The brand's, unless a deployment names another — `hanzo up` stands the whole
 * estate up on this machine, and pointing at it is then one variable rather
 * than a second build. `VITE_HANZO_API` says where the API is; this says where
 * identity is, and they move together. Naming only the API pointed the calls at
 * a local cloud while the bearer still came from the public issuer, so every
 * one of them answered 401.
 */
const issuer = (import.meta.env.VITE_HANZO_IAM as string) || brand.issuer

let engine: IAM | null = null

export const iam = (): IAM => {
  if (engine) return engine

  // Where the browser already is. A redirect URI is a round trip back to THIS
  // document, so the origin serving it is the only correct answer — a literal
  // is right for one port and silently wrong for every other, which is what
  // sent a dev server on 3090 back to a page on 3000 that was not running.
  // What an issuer must then do is register the loopback origins it will serve.
  const here = window.location.origin

  engine = new IAM({
    serverUrl: issuer,
    clientId,
    organization: brand.org,
    redirectUri: `${here}${callbackPath}`,
    postLogoutRedirectUri: `${here}${loginPath}?redirect=false`,
    scope,
  })

  return engine
}
