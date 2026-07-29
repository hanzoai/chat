import { request, iamSession } from '@hanzochat/data-provider';
import { getHanzoIamSdk } from '~/utils/iam';

/**
 * Marks that this tab has already asked hanzo.id whether the browser is signed
 * in. Silent SSO is worth exactly one attempt per tab: a second one cannot learn
 * anything the first did not, and would cost another hidden-iframe round trip on
 * every render that observes an anonymous state.
 */
const SILENT_SSO_ATTEMPTED = 'hanzo.sso.attempted';

/**
 * Marks that this tab has already spent its ONE top-level `prompt=none` bounce.
 * Set BEFORE navigating away, never after: the flag has to survive the round trip
 * and be visible on the way back, or an issuer that answers `login_required`
 * would send us straight back out again — an infinite redirect on the front door.
 */
const SSO_REDIRECT_SPENT = 'hanzo.sso.redirected';

/**
 * Re-mint the on-behalf-of bearer for a caller who IS signed in.
 *
 * Chat forwards the user's own IAM token to cloud (resolveTenantBearer), and
 * `isForwardableToken` requires it to be UNEXPIRED. The id_token lives ~1 hour
 * and chat has no durable refresh for it — its own docs call that a tracked
 * follow-up. So an hour into a perfectly valid session the forwarded bearer goes
 * stale, cloud answers 403, and the product tells a signed-in user to sign in.
 *
 * Silent SSO already solves exactly this: hanzo.id still has the session, so a
 * prompt=none authorize returns fresh tokens, and the SAME session bridge that
 * the interactive login posts to writes them back to req.session.openidTokens.
 * The user never sees anything.
 *
 * Deliberately bypasses the once-per-tab arrival guard — that guard exists to
 * stop an ANONYMOUS render loop from hammering the issuer, which is a different
 * situation from a signed-in caller whose bearer just aged out. It has its own
 * re-entry guard instead, so a burst of failing requests triggers ONE re-mint.
 */
let reminting: Promise<string | null> | null = null;

export function refreshTenantBearer(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (reminting) {
    return reminting;
  }
  reminting = (async () => {
    try {
      const tokens = await getHanzoIamSdk().signinSilent();
      if (!tokens) {
        return null;
      }
      const { token } = await request.post(iamSession(), {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
      return token ?? null;
    } catch {
      return null;
    } finally {
      reminting = null;
    }
  })();
  return reminting;
}

/** True once this tab has bounced through hanzo.id and come back still anonymous. */
export function ssoRedirectSpent(): boolean {
  return typeof window !== 'undefined' && sessionStorage.getItem(SSO_REDIRECT_SPENT) === '1';
}

/**
 * Why the login gate opened. `limit` — the free preview quota is spent;
 * `anonymous` — the request was refused because the visitor is not signed in
 * (no bearer at all, or an expired guest/session bearer).
 */
export type LoginReason = 'limit' | 'anonymous' | 'welcome';

/** Marks that this tab has already shown the arrival gate; dismissing must stick. */
const WELCOME_SHOWN = 'hanzo.login.welcomed';

/**
 * Open the arrival gate once per tab for a visitor who is not signed in.
 *
 * `limit` and `anonymous` are REFUSALS — something was denied and the gate
 * explains it. `welcome` is not: nothing failed, we are simply offering the
 * better product before they start, the way chatgpt.com does. It must therefore
 * be dismissible and must stay dismissed, or it becomes a wall in front of a
 * product we deliberately let people use signed out.
 */
export function offerLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (sessionStorage.getItem(WELCOME_SHOWN) === '1') {
    return;
  }
  sessionStorage.setItem(WELCOME_SHOWN, '1');
  window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED, { detail: { reason: 'welcome' } }));
}

/** Window event carrying a {@link LoginReason}. `LoginGate` listens for it. */
export const LOGIN_REQUIRED = 'loginRequired';

/**
 * The ONE way to start the Hanzo IAM (hanzo.id) login from any anonymous/guest
 * surface. @hanzo/iam is the single login path: every surface (login gate,
 * account menu "Log in") drives the same redirect-PKCE flow to hanzo.id.
 */
export function startHanzoLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }
  getHanzoIamSdk().signinRedirect();
}

/**
 * Ask hanzo.id, without any interaction, whether this browser already has a
 * session — and if so, mint the local Chat session from it.
 *
 * This is what makes "I am signed in on hanzo.app, why am I anonymous here?"
 * stop happening. hanzo.chat and hanzo.app are different registrable domains, so
 * no cookie can ever span them; the ONLY mechanism that carries a session across
 * is an OIDC `prompt=none` authorize against the shared issuer. Without it every
 * Hanzo surface starts anonymous on every first visit, forever, no matter how
 * recently the user signed in next door.
 *
 * Deliberately silent about failure. `signinSilent` returns null when the user
 * genuinely has no hanzo.id session — the common, correct case — and throws when
 * the hidden iframe is blocked outright (third-party cookie policy). Neither is
 * an error worth showing anyone: both simply mean "still anonymous", which is
 * the state we were already in. The interactive {@link startHanzoLogin} remains
 * the answer for both.
 *
 * Returns the Chat JWT when a session was adopted, else null.
 */
export async function trySilentSso(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  if (sessionStorage.getItem(SILENT_SSO_ATTEMPTED) === '1') {
    return null;
  }
  sessionStorage.setItem(SILENT_SSO_ATTEMPTED, '1');

  try {
    const tokens = await getHanzoIamSdk().signinSilent();
    if (!tokens) {
      return null;
    }

    // Same bridge the interactive callback uses — the backend JWKS-validates and
    // reconciles the user. One session-minting path, two ways of reaching it.
    const { token } = await request.post(iamSession(), {
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    });
    if (!token) {
      return null;
    }

    request.dispatchTokenUpdatedEvent(token);
    return token;
  } catch {
    return null;
  }
}

/**
 * Open the login gate. A refused request has no answer to show — only a reason
 * to sign in — so every such path asks for the gate instead of rendering the
 * raw server error as if it were a reply.
 */
export function requireLogin(reason: LoginReason): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED, { detail: { reason } }));
}
