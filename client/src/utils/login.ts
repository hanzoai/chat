import type { TStartupConfig } from 'librechat-data-provider';
import { getHanzoIamSdk, isStaticIamMode } from '~/utils/iam';

/**
 * The ONE way to start the Hanzo IAM (hanzo.id) login from an anonymous/guest
 * surface. Prefers the static-IAM SPA redirect when that mode is active, else the
 * backend OpenID redirect, else the local `/login` route. Shared by the
 * guest-limit gate and the account menu's guest "Log in" item so the upgrade path
 * is uniform (chat -> hanzo.id) across every surface.
 */
export function startHanzoLogin(startupConfig?: Partial<TStartupConfig> | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  const iamSdk = getHanzoIamSdk();
  if (isStaticIamMode() && iamSdk) {
    iamSdk.signinRedirect();
    return;
  }
  if (startupConfig?.openidLoginEnabled && startupConfig?.serverDomain) {
    window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
    return;
  }
  window.location.href = '/login';
}
