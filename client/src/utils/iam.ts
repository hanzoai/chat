/**
 * Shared @hanzo/iam singleton + config for Hanzo IAM OIDC flows.
 *
 * Reads VITE_HANZO_IAM_URL, VITE_HANZO_IAM_APP, VITE_HANZO_IAM_ORG, and
 * VITE_HANZO_API_URL from the Vite environment. Returns null when IAM is
 * not configured (backend-proxied mode).
 *
 * Login is EMBEDDED (in-app form via `@hanzo/iam/views <Login>`) — no
 * redirect to the IAM-hosted page. The IAM class mints a PKCE-bound code
 * via the credential endpoint; this SDK instance completes the standard
 * PKCE exchange in the /auth/callback route.
 */
import { IAM } from '@hanzo/iam/browser';

export interface HanzoIamConfig {
  serverUrl: string;
  clientId: string;
  organization: string;
  redirectUri: string;
  proxyBaseUrl?: string;
}

export function getHanzoIamConfig(): HanzoIamConfig | null {
  const serverUrl = import.meta.env.VITE_HANZO_IAM_URL;
  const clientId = import.meta.env.VITE_HANZO_IAM_APP;

  if (!serverUrl || !clientId) {
    return null;
  }

  return {
    serverUrl,
    clientId,
    organization: import.meta.env.VITE_HANZO_IAM_ORG || 'hanzo',
    redirectUri: `${window.location.origin}/auth/callback`,
    proxyBaseUrl: import.meta.env.VITE_HANZO_API_URL || undefined,
  };
}

let instance: IAM | null = null;
let checked = false;

export function getHanzoIamSdk(): IAM | null {
  if (checked) {
    return instance;
  }
  checked = true;

  const cfg = getHanzoIamConfig();
  if (!cfg) {
    return null;
  }

  instance = new IAM({
    serverUrl: cfg.serverUrl,
    clientId: cfg.clientId,
    organization: cfg.organization,
    redirectUri: cfg.redirectUri,
    scope: 'openid profile email',
    proxyBaseUrl: cfg.proxyBaseUrl,
  });

  return instance;
}

/**
 * Whether the app is running in static/IAM mode (VITE_HANZO_API_URL is set).
 */
export function isStaticIamMode(): boolean {
  return !!import.meta.env.VITE_HANZO_API_URL;
}
