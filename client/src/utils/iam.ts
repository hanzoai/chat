/**
 * Shared browser IAM SDK singleton for Hanzo IAM PKCE login.
 *
 * @hanzo/iam is the single login path. The SDK drives the redirect-PKCE
 * authorize + callback exchange; IAM owns every credential step. Config is
 * read from the Vite environment with production defaults so login works
 * out of the box.
 */
// @hanzo/iam (0.13.x) exports the browser SPA client as the `IAM` class; the
// constructor config (serverUrl, clientId, redirectUri, scope, proxyBaseUrl) is
// unchanged from the earlier `BrowserIamSdk` name.
import { IAM } from '@hanzo/iam';

let instance: IAM | null = null;

const SERVER_URL = import.meta.env.VITE_HANZO_IAM_URL || 'https://hanzo.id';
const CLIENT_ID = import.meta.env.VITE_HANZO_IAM_APP || 'hanzo-chat';
const ORGANIZATION = import.meta.env.VITE_HANZO_IAM_ORG || 'hanzo';

/** The single IAM SDK instance driving PKCE login and callback exchange. */
export function getHanzoIamSdk(): IAM {
  if (instance) {
    return instance;
  }

  instance = new IAM({
    serverUrl: SERVER_URL,
    clientId: CLIENT_ID,
    organization: ORGANIZATION,
    redirectUri: `${window.location.origin}/auth/callback`,
    scope: 'openid profile email',
    proxyBaseUrl: import.meta.env.VITE_HANZO_API_URL || undefined,
  });

  return instance;
}
