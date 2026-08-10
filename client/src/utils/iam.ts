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

/**
 * What the SERVER says this deployment's IAM identity is.
 *
 * `import.meta.env.VITE_*` is inlined by Vite at BUILD time, so on its own it
 * pins the login client to whichever brand the image was built for — and a
 * second brand running the same image then sends its visitors to the FIRST
 * brand's issuer with a `redirect_uri` that issuer has never heard of. The
 * issuer cannot redirect somewhere it does not trust, so it renders an error
 * page instead and the product is unreachable while the server stays healthy.
 *
 * The shell carries the answer instead (`api/server/iamConfig.js`), read from
 * the same `OPENID_ISSUER` / `OPENID_CLIENT_ID` the backend's own strategy
 * registers with, so the two halves of one login cannot disagree. It is a
 * global rather than a fetch because `OAuthCallback` needs it before any
 * config request has happened.
 *
 * Per-KEY fallback, not per-object: a deployment that states only its issuer
 * still gets the compiled defaults for the rest.
 */
type IamShellConfig = { serverUrl?: string; clientId?: string; organization?: string };

function fromShell(): IamShellConfig {
  return (typeof window !== 'undefined' && (window as { __HANZO_IAM__?: IamShellConfig }).__HANZO_IAM__) || {};
}

const shell = fromShell();

const SERVER_URL = shell.serverUrl || import.meta.env.VITE_HANZO_IAM_URL || 'https://hanzo.id';
const CLIENT_ID = shell.clientId || import.meta.env.VITE_HANZO_IAM_APP || 'hanzo-chat';
const ORGANIZATION = shell.organization || import.meta.env.VITE_HANZO_IAM_ORG || 'hanzo';

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
