import axios from 'axios';

export function setAcceptLanguageHeader(value: string): void {
  axios.defaults.headers.common['Accept-Language'] = value;
}

export function setTokenHeader(token: string) {
  // The bearer is PAGE state, not module state. This module is bundled more
  // than once (root + react-query entrypoints each inline it), so a copy's
  // axios defaults are invisible to requests dispatched through another
  // copy — measured as a guest send leaving with no Authorization seconds
  // after a bootstrap call carried it. The page-global is the one source of
  // truth; every copy's injection interceptor (request.ts) reads it.
  // `window`, NOT `globalThis`: the client build's node-polyfill plugin shims
  // `globalThis` inside bundled modules, so a globalThis write lands on the
  // shim and the page never sees it.
  if (typeof window !== 'undefined') {
    (window as unknown as { __bearer?: string }).__bearer = token || undefined;
  }
  if (token) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

/**
 * Set a publishable key (pk-) as the default auth header.
 * Used for unauthenticated access (model listing, health checks).
 */
export function setPublishableKeyHeader(key: string) {
  if (key && key.startsWith('pk-')) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + key;
  }
}

/**
 * Enable cross-origin credentials for cloud gateway requests.
 * Required when frontend (hanzo.chat) talks to api.hanzo.ai.
 */
export function enableCrossOriginCredentials() {
  axios.defaults.withCredentials = true;
}

/**
 * How this page gets a fresh bearer when the one it holds is refused.
 *
 * The renewal itself belongs to Hanzo IAM — its refresh grant, spent by the IAM
 * SDK the app configures — so this layer only needs to be told how to ask. The
 * app installs it once at startup; nothing here knows what a token is or how one
 * is minted.
 *
 * Page-global for the same reason the bearer is: this module is bundled more
 * than once, and a renewer stored in one copy's module state is invisible to a
 * request dispatched through another.
 */
export function setTokenRenewer(renew: () => Promise<string | null>): void {
  if (typeof window !== 'undefined') {
    (window as unknown as { __renewBearer?: () => Promise<string | null> }).__renewBearer = renew;
  }
}

/** Ask for a fresh bearer, or null when nothing can supply one. */
export function renewBearer(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  const renew = (window as unknown as { __renewBearer?: () => Promise<string | null> })
    .__renewBearer;
  return renew ? renew() : Promise.resolve(null);
}
