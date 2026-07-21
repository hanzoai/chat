import { getHanzoIamSdk } from '~/utils/iam';

/**
 * The ONE way to start the Hanzo IAM (hanzo.id) login from any anonymous/guest
 * surface. @hanzo/iam is the single login path: every surface (guest-limit gate,
 * account menu "Log in") drives the same redirect-PKCE flow to hanzo.id.
 */
export function startHanzoLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }
  getHanzoIamSdk().signinRedirect();
}
