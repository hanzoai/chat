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

export const iam = (): IAM =>
  (engine ??= new IAM({
    serverUrl: brand.issuer,
    clientId,
    organization: brand.org,
    redirectUri: `${window.location.origin}${callbackPath}`,
    /**
     * Where the issuer returns the browser once the session has ended.
     *
     * `?redirect=false` is what makes this a landing rather than a bounce: the
     * login route starts a fresh authorize on mount, so a bare `/login` would
     * send somebody who just signed out straight back to the issuer. Built from
     * the current origin for the same reason the callback is — each brand
     * returns to its OWN host, and each host registers this exact address.
     */
    postLogoutRedirectUri: `${window.location.origin}${loginPath}?redirect=false`,
    scope,
  }))
