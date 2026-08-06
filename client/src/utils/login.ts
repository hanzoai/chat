import { getHanzoIamSdk } from '~/utils/iam';

/**
 * Why the login gate opened. `limit` — the free preview quota is spent;
 * `anonymous` — the request was refused because the visitor is not signed in
 * (no bearer at all, or an expired guest/session bearer); `unavailable` — the
 * signed-out preview itself could not be started, so there is no anonymous
 * product to fall back to.
 */
export type LoginReason = 'limit' | 'anonymous' | 'unavailable';

/**
 * The reason a gate that has not mounted yet must still show.
 *
 * Auth resolves BEFORE the shell paints — a refused guest mint answers in
 * milliseconds while `Root` is still showing its spinner — so a refusal
 * dispatched then reaches no listener and the visitor gets a page with no
 * composer and no explanation. Holding the last reason lets the gate pick it up
 * on mount; reading CONSUMES it, so a dismissal is never undone by a remount.
 */
let pendingReason: LoginReason | null = null;

export function takePendingLogin(): LoginReason | null {
  const reason = pendingReason;
  pendingReason = null;
  return reason;
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
 * Open the login gate. A refused request has no answer to show — only a reason
 * to sign in — so every such path asks for the gate instead of rendering the
 * raw server error as if it were a reply.
 */
export function requireLogin(reason: LoginReason): void {
  if (typeof window === 'undefined') {
    return;
  }
  pendingReason = reason;
  window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED, { detail: { reason } }));
}
