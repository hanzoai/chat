/**
 * Shared BrowserIamSdk singleton for Hanzo IAM OIDC flows.
 *
 * Reads VITE_HANZO_IAM_URL, VITE_HANZO_IAM_APP, and VITE_HANZO_API_URL
 * from the Vite environment. Returns null when IAM is not configured
 * (i.e. the app is running in backend-proxied mode).
 */
// @hanzo/iam (0.4.x) exports the browser SPA client as `BrowserIamSdk`; the old
// `IAM` alias no longer exists and its named import hard-crashes the app at mount
// (and fails the Rollup build). The constructor config is identical.
import { BrowserIamSdk } from '@hanzo/iam';

let instance: BrowserIamSdk | null = null;
let checked = false;

export function getHanzoIamSdk(): BrowserIamSdk | null {
  if (checked) {
    return instance;
  }
  checked = true;

  const serverUrl = import.meta.env.VITE_HANZO_IAM_URL;
  const clientId = import.meta.env.VITE_HANZO_IAM_APP;

  if (!serverUrl || !clientId) {
    return null;
  }

  instance = new BrowserIamSdk({
    serverUrl,
    clientId,
    redirectUri: `${window.location.origin}/auth/callback`,
    scope: 'openid profile email',
    proxyBaseUrl: import.meta.env.VITE_HANZO_API_URL || undefined,
  });

  return instance;
}

/**
 * Whether the app is running in static/IAM mode (VITE_HANZO_API_URL is set).
 */
export function isStaticIamMode(): boolean {
  return !!import.meta.env.VITE_HANZO_API_URL;
}
