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
import { setTokenRenewer } from '@hanzochat/data-provider';

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
  return (typeof window !== 'undefined' && (window as { __IAM__?: IamShellConfig }).__IAM__) || {};
}

const shell = fromShell();

const SERVER_URL = shell.serverUrl || import.meta.env.VITE_HANZO_IAM_URL || 'https://hanzo.id';
const CLIENT_ID = shell.clientId || import.meta.env.VITE_HANZO_IAM_APP || 'hanzo-chat';
const ORGANIZATION = shell.organization || import.meta.env.VITE_HANZO_IAM_ORG || 'hanzo';

/**
 * The identity provider's name, for the one screen that says where it is sending
 * you. Derived from the SAME runtime organization the SDK signs in against, so
 * the sentence and the destination cannot disagree.
 *
 * It existed as the literal "Hanzo" on the redirect screen, which put HANZO's
 * name on LUX's identity host: a customer on lux.chat was told "Redirecting to
 * Hanzo..." while being sent to lux.id. That is the white-label rule broken on
 * the one screen whose entire job is to name the destination.
 *
 * Capitalised rather than mapped through a table: the org slug IS the brand for
 * every tenant here (hanzo, lux, zoo, pars), and a table would be a second place
 * for the name to drift from the identity actually being used.
 */
export const IAM_PROVIDER_NAME =
  ORGANIZATION.charAt(0).toUpperCase() + ORGANIZATION.slice(1);

/**
 * WHICH tenant this deployment serves, read from the same runtime organization
 * the SDK signs in against.
 *
 * Anything carrying a brand's wordmark, copy or cross-app chrome has to ask this
 * before it paints, because one image serves every brand. A build-time `VITE_*`
 * cannot answer it — Vite inlines the value, so the image would carry whichever
 * brand happened to build it. That is precisely how hanzo.chat's marketing page
 * became the signed-out front door of lux.chat: nothing on it ever asked.
 */
export const IAM_ORG = ORGANIZATION;

/**
 * Where a visitor with no account goes to make one.
 *
 * Composed from the SAME issuer and client the SDK signs in against, because the
 * account it creates has to be an account this app can then log in with. Written
 * out by hand it was `hanzo.id/signup/hanzo-chat` in every image, so the Sign up
 * button in lux.chat's sidebar sent a Lux visitor to Hanzo's identity host to
 * create a Hanzo account — the login half of this file already learned that
 * lesson; the sign-up half had not.
 */
export const IAM_SIGNUP_URL = `${SERVER_URL}/signup/${CLIENT_ID}`;

/**
 * The sign-up address carrying THIS app's authorize request.
 *
 * Registration is a way IN, so it ends where signing in ends: the issuer's
 * sign-up screen accepts the same `redirect_uri`, `state` and PKCE challenge the
 * authorize endpoint does, and answers a completed registration by sending the
 * browser to `/auth/callback` with a code. The account is therefore signed in
 * here the moment it exists, on the surface it was created for, rather than left
 * at the issuer for the visitor to find their own way back from.
 *
 * Address and request come from the two places that own them: `IAM_SIGNUP_URL`
 * is where this deployment's issuer registers accounts, and the SDK mints and
 * stores the one-shot verifier the callback spends.
 */
export async function signupUrl(): Promise<string> {
  const authorize = new URL(await getHanzoIamSdk().getSigninUrl());
  const signup = new URL(IAM_SIGNUP_URL);
  signup.search = authorize.search;
  return signup.toString();
}

/**
 * Where a person manages the account itself — profile, password, sessions.
 *
 * Composed from the SAME issuer the SDK signs in against, for the same reason
 * sign-up above is: the account being managed LIVES at that issuer, so any other
 * host is not a branding slip but a dead end. Written out by hand it was
 * `hanzo.id/account` in every image, so the Account row of lux.chat's own menu
 * sent a Lux customer to Hanzo's identity host to manage an account that exists
 * at lux.id — and being signed in here says nothing about being signed in there,
 * so what they actually got was a sign-in form for the wrong tenant.
 */
export const IAM_ACCOUNT_URL = `${SERVER_URL}/account`;

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
    /**
     * Where IAM returns the browser once the session has ended.
     *
     * `?redirect=false` is what makes this a landing rather than a bounce: the
     * login route starts a fresh authorize on mount, so a bare `/login` would
     * send someone who just signed out straight back to the issuer. Built from
     * `window.location.origin` for the same reason the callback above is — each
     * brand returns to its OWN host, and each host registers this exact address
     * with its own IAM application.
     */
    postLogoutRedirectUri: `${window.location.origin}/login?redirect=false`,
    /**
     * `offline_access` is what makes a session outlive its access token.
     *
     * IAM issues a refresh token only when it is asked for one, and without it
     * the only way past an expiry is a full redirect to the issuer — a page
     * navigation in the middle of whatever someone was typing. With it, the SDK
     * renews in place and the visit is uninterrupted.
     */
    scope: 'openid profile email offline_access',
    proxyBaseUrl: import.meta.env.VITE_HANZO_API_URL || undefined,
  });

  /**
   * Teach the request layer how to get a fresh bearer. It knows when one is
   * refused; IAM is what can issue another. Installed here so there is exactly
   * one renewal path, and it is the SDK's.
   */
  setTokenRenewer(() => instance!.getValidAccessToken());

  return instance;
}
