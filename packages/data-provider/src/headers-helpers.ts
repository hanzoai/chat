import axios from 'axios';

export function setAcceptLanguageHeader(value: string): void {
  axios.defaults.headers.common['Accept-Language'] = value;
}

export function setTokenHeader(token: string) {
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
