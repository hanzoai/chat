/**
 * Ask the issuer, once per visit, whether this browser is already signed in.
 *
 * Somebody who signed in at hanzo.id — or at console.hanzo.ai, or hanzo.app —
 * arrives here and is shown "Sign up / Log in", because nothing on this surface
 * ever asked. The session was there the whole time. Sign in once and every Hanzo
 * surface should find you, so that credit and history follow the person rather
 * than the hostname.
 *
 * # Why it is a navigation, and why an iframe can never be one
 *
 * hanzo.ai, hanzo.chat and hanzo.app are different registrable domains, so no
 * cookie spans them. It does not need to. The IAM session cookie is
 * `SameSite=Lax`, and Lax IS presented on a top-level cross-site GET navigation
 * — so handing the whole document to the issuer carries it, and the issuer
 * answers from the session alone. The redirect is not a fallback for silence; it
 * IS the silent path.
 *
 * The hidden-iframe version of this cannot work and must not come back. An
 * iframe is a cross-site SUBRESOURCE: Lax withholds the cookie, the edge answers
 * `X-Frame-Options: DENY`, and the issuer refuses on `Sec-Fetch-Dest` besides.
 * The two answers differ exactly as designed —
 *
 *     Sec-Fetch-Dest: document  ->  error=login_required        (asked, nobody home)
 *     Sec-Fetch-Dest: iframe    ->  error=interaction_required  (refused outright)
 *
 * — and making the iframe work would mean `SameSite=None`, which presents the
 * session on every cross-site subresource request on the internet.
 *
 * # Why it is silent, and why it happens at most once
 *
 * `prompt=none` says: answer from the session, or do not answer at all. The
 * issuer renders nothing — it returns a code, or `error=login_required`. So a
 * visitor who is genuinely a stranger is never shown a login screen they did not
 * ask for, and the anonymous preview survives intact.
 *
 * The attempt is recorded BEFORE the navigation. A probe that never comes back —
 * issuer down, network gone, tab closed mid-flight — must still count as spent,
 * because the alternative is a boot loop through the issuer that makes the
 * product unreachable. Losing one probe costs a visitor their guest session for
 * this visit; losing the bound costs everyone the product.
 */
import { keepHere } from '~/data/back'

const SLOT = 'chat.probed'

/**
 * `sessionStorage`, because the tab is the visit.
 *
 * "Is anyone signed in?" is a question whose answer CHANGES — somebody signs in
 * at hanzo.id in another tab and comes back — so pinning the first answer in
 * `localStorage` would mean a browser that answered "no" once answers "no"
 * forever. That is this file's own bug, merely deferred. Per visit it costs one
 * redirect and then heals itself.
 */
const slot = (): Storage | null => {
  try {
    return window.sessionStorage
  } catch {
    /* Storage refused. With no way to record the attempt there is no way to
       bound it, so the probe does not run at all rather than run unbounded. */
    return null
  }
}

/** Whether the callback route is deciding this visitor's identity right now. */
export const exchanging = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')

/** Routes that own an authorize round trip of their own; the probe stays out. */
const busy = (pathname: string) => exchanging() || pathname.startsWith('/login')

/**
 * The OIDC §3.1.2.6 answers that all mean the same thing here: nobody is signed
 * in at the issuer, so carry on as a guest.
 *
 * `interaction_required` belongs in the list because it is what the issuer
 * answers a request it will not serve silently. Treating it as a broken login
 * would put a dead end where the anonymous product should be.
 */
const NOBODY = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
])

/** Whether an `error` on the callback means "no session", not "login broke". */
export const noSession = (error: string | null | undefined): boolean =>
  error != null && NOBODY.has(error)

/** Whether this visit has already spent its probe. */
export const probed = (): boolean => slot()?.getItem(SLOT) === '1'

/**
 * Spend the probe.
 *
 * `go` is the navigation — `session.tsx` passes the IAM SDK's authorize redirect
 * carrying `prompt=none`. This file owns WHEN and at what cost; it does not own
 * how a credential flow is started, and importing an SDK to find out would put
 * two modules in charge of one session.
 *
 * Answers `true` when a navigation is under way, in which case the caller must
 * NOT go on to adopt a guest identity — this document is leaving, and a guest
 * minted on the way out is spent on a page that is already gone and races the
 * session about to land. Answers `false` when the probe did not run, and the
 * caller carries on exactly as it would have.
 */
export const probe = async (go: () => Promise<void>): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  const storage = slot()
  if (!storage || storage.getItem(SLOT) === '1') return false
  if (busy(window.location.pathname)) return false

  try {
    // Recorded FIRST. Between this line and the navigation is the only window
    // in which a crash costs a probe, and that is the cheap failure.
    storage.setItem(SLOT, '1')
    keepHere()
    await go()
    return true
  } catch {
    /* The flow could not start (no crypto, storage vanished mid-call). The
       attempt stays marked — whatever refused to build one URL will refuse the
       next — and this visitor continues as a guest. */
    return false
  }
}
