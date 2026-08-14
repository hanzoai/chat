import { getHanzoIamSdk } from '~/utils/iam';

/**
 * Ask hanzo.id, once per visit, whether this browser is already signed in.
 *
 * Somebody who signed in at hanzo.id — or at console.hanzo.ai, or hanzo.app —
 * arrived here and was shown "Sign up / Log in", because nothing on this surface
 * ever asked. The session was there the whole time; chat was the only Hanzo
 * product that did not look for it. That is what this closes: sign in once, and
 * every Hanzo surface finds you, so credits and history follow the person rather
 * than the hostname.
 *
 * # Why a redirect, and why an iframe can never do it
 *
 * `hanzo.ai`, `hanzo.chat` and `hanzo.app` are different registrable domains, so
 * NO cookie spans them. It does not need to. The IAM session cookie is
 * `SameSite=Lax`, and Lax IS presented on a TOP-LEVEL cross-site GET navigation
 * — so navigating the whole browser to the issuer carries it, and the issuer
 * answers from the session alone. The redirect is not a fallback for silence; it
 * IS the silent path.
 *
 * The classic hidden-iframe trick cannot work here and must not be revived. An
 * iframe is a cross-site SUBRESOURCE: Lax withholds the cookie, the edge answers
 * `X-Frame-Options: DENY`, and the issuer refuses on `Sec-Fetch-Dest` besides
 * (`internal/oidc/prompt.go`, `silentGrant`). Measured against production, the
 * two answers differ exactly as designed:
 *
 *     Sec-Fetch-Dest: document  ->  ?error=login_required        (asked, nobody home)
 *     Sec-Fetch-Dest: iframe    ->  ?error=interaction_required  (refused outright)
 *
 * Making the iframe work would mean `SameSite=None`, which presents the session
 * on every cross-site subresource request on the internet. IAM refuses that
 * deliberately.
 *
 * # Why it is silent, and why it happens at most once
 *
 * `prompt=none` says: answer from the session or do not answer at all. The
 * issuer renders nothing — it redirects back with a code, or with
 * `error=login_required`. So a visitor who is NOT signed in is never shown a
 * login screen they did not ask for, and the anonymous guest preview survives
 * intact. That is the whole reason this is not simply a redirect to login.
 *
 * The attempt is recorded BEFORE the navigation, not after. A probe that never
 * comes back — issuer down, network gone, tab closed mid-flight — must still be
 * an attempt already spent, because the alternative is that hanzo.chat boot-loops
 * through the issuer and nobody can reach the product at all.
 */

/** Where the spent attempt is recorded. */
const PROBED = 'hanzo.sso.probed';

/**
 * `sessionStorage`: the tab is the visit. "Is anyone signed in?" is a question
 * whose answer CHANGES — someone signs in at hanzo.id in another tab and comes
 * back — so pinning the first answer in `localStorage` would mean a browser that
 * answered "no" once answers "no" forever, which is the bug this file exists to
 * fix, merely deferred. Per visit it costs one redirect and then self-heals.
 */
function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    /* Storage refused (private mode, blocked cookies). Handled by the caller:
       with no way to record the attempt there is no way to bound it, so the
       probe does not run at all rather than run unbounded. */
    return null;
  }
}

/**
 * Whether the callback route is deciding this visitor's identity right now.
 *
 * `AuthContextProvider` wraps `/auth/callback`, so the ordinary signed-out path
 * — refresh, fail, fall back — runs there too, on top of a code that is being
 * redeemed. Probing from it would navigate away from that code; minting a guest
 * from it spends the per-IP budget on a visitor who is about to be signed in,
 * and races the real session into the bargain. The callback owns its outcome:
 * everything else stands down until it lands.
 */
export function exchanging(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback');
}

/** Routes that own an authorize round-trip of their own; the probe stays out. */
function ownsItsOwnFlow(pathname: string): boolean {
  // `/login` is the INTERACTIVE redirect, a stronger request than this one, and
  // must not be pre-empted by it.
  return exchanging() || pathname.startsWith('/login');
}

/**
 * The OIDC §3.1.2.6 answers that all mean the same thing to this app: nobody is
 * signed in at the issuer, so carry on as a guest.
 *
 * `interaction_required` is here because it is what the issuer answers a request
 * it will not serve silently — including one that reached it framed. Treating it
 * as an error page would put a dead end where the anonymous product should be.
 */
const NO_SESSION = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
]);

/** Whether an `error` on the callback means "no session", not "login broke". */
export function meansNoSession(error: string | null | undefined): boolean {
  return error != null && NO_SESSION.has(error);
}

/** Whether this visit has already spent its probe. */
export function probed(): boolean {
  return store()?.getItem(PROBED) === '1';
}

/**
 * Spend the probe: record the attempt, then navigate to the issuer.
 *
 * Returns `true` when a navigation is under way, in which case the caller must
 * not go on to adopt a guest identity — this document is leaving. Returns
 * `false` when the probe did not run (already spent, wrong route, no storage to
 * bound it with, or the SDK refused to build the URL), and the caller proceeds
 * exactly as it did before.
 */
export async function probeSession(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  const storage = store();
  if (!storage || storage.getItem(PROBED) === '1') {
    return false;
  }
  if (ownsItsOwnFlow(window.location.pathname)) {
    return false;
  }
  try {
    // Recorded FIRST. Between this line and the navigation is the only window in
    // which a crash could cost a probe, and losing one is the cheap failure —
    // the visitor stays a guest for this visit. Losing the bound is the
    // expensive one.
    storage.setItem(PROBED, '1');
    await getHanzoIamSdk().signinRedirect({ additionalParams: { prompt: 'none' } });
    return true;
  } catch {
    /* The SDK could not start the flow (no crypto, storage vanished mid-call).
       The attempt stays marked — an SDK that cannot build one URL will not build
       the next — and this visitor continues as a guest. */
    return false;
  }
}
