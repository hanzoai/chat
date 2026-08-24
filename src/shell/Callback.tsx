import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { loginPath } from '~/data/api'
import { useSession } from '~/data/session'
import { Waiting } from '~/shell/Boundary'

/**
 * Where a sign-in lands on the way back from the issuer.
 *
 * The whole exchange is `land()` — one call, in `data/session`, which verifies
 * the state, spends the authorization code with the PKCE verifier it kept, and
 * installs the token it gets back. This screen owns only what the router owns:
 * where to go next, and what to show while it happens.
 *
 * There is no fourth party and no second exchange. The token the issuer just
 * minted is the one every request carries and the one the server verifies
 * against the issuer's JWKS. Trading it for an app-issued token of our own
 * would put a credential we invented back in the middle of a flow whose entire
 * point is that the issuer owns the session.
 *
 * A code can be spent exactly ONCE, which is why the guard is a ref and not a
 * dependency array: StrictMode runs an effect, tears it down and runs it again,
 * and the second run would present a code the issuer has already burned and
 * land the visitor on an error page after a sign-in that worked.
 *
 * "Nobody is signed in" is not handled here, because it is not a failure — the
 * silent probe asks `prompt=none` and the issuer answers `error=login_required`
 * for exactly the visitor the anonymous product exists to serve. `land()` reads
 * that and returns the way back, quietly.
 */
export const Callback = () => {
  const { land } = useSession()
  const navigate = useNavigate()
  const spent = useRef(false)

  useEffect(() => {
    if (spent.current) return
    spent.current = true

    land().then(
      (where) => navigate(where, { replace: true }),
      () => navigate(`${loginPath}?error=refused`, { replace: true }),
    )
  }, [land, navigate])

  return <Waiting>Signing you in…</Waiting>
}
