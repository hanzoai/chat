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
