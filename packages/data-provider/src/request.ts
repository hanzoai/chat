/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP request layer for the Hanzo Chat (Chat-native) backend.
 *
 * - Talks to the same-origin `/v1/chat/*` REST surface.
 * - Auth is JWT Bearer (set via setTokenHeader) plus the httpOnly `refreshToken`
 *   cookie; `withCredentials: true` ensures that cookie is sent so the silent
 *   refresh against `POST /v1/chat/auth/refresh` can mint a fresh access token.
 * - On a 401 the interceptor refreshes once and replays the original request.
 * - pk- key support is retained for unauthenticated access (model listing, etc.).
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as endpoints from './api-endpoints';
import { setTokenHeader } from './headers-helpers';
import type * as t from './types';

async function _get<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response = await axios.get(url, { withCredentials: true, ...options });
  return response.data;
}

async function _getResponse<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  return await axios.get(url, { withCredentials: true, ...options });
}

async function _post(url: string, data?: any) {
  const response = await axios.post(url, JSON.stringify(data), {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

async function _postMultiPart(url: string, formData: FormData, options?: AxiosRequestConfig) {
  const response = await axios.post(url, formData, {
    withCredentials: true,
    ...options,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

async function _postTTS(url: string, formData: FormData, options?: AxiosRequestConfig) {
  const response = await axios.post(url, formData, {
    withCredentials: true,
    ...options,
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'arraybuffer',
  });
  return response.data;
}

async function _put(url: string, data?: any) {
  const response = await axios.put(url, JSON.stringify(data), {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

async function _delete<T>(url: string): Promise<T> {
  const response = await axios.delete(url, { withCredentials: true });
  return response.data;
}

async function _deleteWithOptions<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response = await axios.delete(url, { withCredentials: true, ...options });
  return response.data;
}

async function _patch(url: string, data?: any) {
  const response = await axios.patch(url, JSON.stringify(data), {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: { resolve: (value?: any) => void; reject: (reason?: any) => void }[] = [];

const refreshToken = (retry?: boolean): Promise<t.TRefreshTokenResponse | undefined> =>
  _post(endpoints.refreshToken(retry));

const dispatchTokenUpdatedEvent = (token: string) => {
  setTokenHeader(token);
  window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
};

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/** The bearer currently on the axios default header, or null when anonymous. */
function currentBearer(): string | null {
  const auth = axios.defaults.headers.common['Authorization'];
  return typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

/**
 * A guest (anonymous preview) session carries a `{ guest: true }` JWT that is
 * only valid on the chat-completion route; every other endpoint answers 401 by
 * design. Those expected 401s must NOT hard-redirect the guest to /login — that
 * wipes the guest session and loops. Derive guest-ness from the active bearer so
 * the interceptor leaves guests on the chat surface.
 */
function isGuestSession(): boolean {
  const tok = currentBearer();
  if (tok == null) {
    return false;
  }
  try {
    const b64 = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')));
    return payload?.guest === true;
  } catch {
    return false;
  }
}

// Every axios this module copy sees arms itself from the page-global bearer
// (set by setTokenHeader). Belt to the defaults' braces: whichever bundled
// copy of this module dispatches a request, the session header rides along.
if (typeof window !== 'undefined') {
  axios.interceptors.request.use((config) => {
    // `window`, not `globalThis` — see headers-helpers.ts.
    const bearer = (window as unknown as { __hanzoBearer?: string }).__hanzoBearer;
    if (bearer && config.headers?.Authorization == null) {
      config.headers.Authorization = 'Bearer ' + bearer;
    }
    return config;
  });
}

// Auto-retry on 401 (access token expired): refresh once, then replay.
if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!error.response) {
        return Promise.reject(error);
      }

      // Don't retry auth endpoints that legitimately 401.
      if (originalRequest.url?.includes('/v1/chat/auth/2fa') === true) {
        return Promise.reject(error);
      }
      if (originalRequest.url?.includes('/v1/chat/auth/logout') === true) {
        return Promise.reject(error);
      }
      // A 401 from the refresh endpoint IS the refresh failing — terminal,
      // like 2fa and logout above. Routing it through the retry machinery
      // issues a second refresh whose own 401 queues behind `isRefreshing`,
      // which only clears when that second call settles: a deadlock that
      // strands every caller and the auth state machine with it. Reject so
      // the AuthContext mutation's onError takes the guest/login fallback.
      if (originalRequest.url?.includes('auth/refresh') === true) {
        return Promise.reject(error);
      }

      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (isRefreshing) {
          try {
            const token = await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return await axios(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        isRefreshing = true;

        try {
          // Refresh originals never reach here (rejected above), so this call
          // is always on behalf of some other 401'd request.
          const response = await refreshToken(false);

          const token = response?.token ?? '';

          if (token) {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            dispatchTokenUpdatedEvent(token);
            processQueue(null, token);
            return await axios(originalRequest);
          }

          // No new token. Every queued caller must still be answered, or its
          // promise never settles: a guest whose chat POST queued behind another
          // 401's refresh would spin forever instead of being told it is not
          // signed in. Reject with the original 401 so each caller sees the real
          // status (the chat submit path turns that into the login gate).
          processQueue(error as AxiosError, null);

          if (window.location.href.includes('share/')) {
            console.log(
              `Refresh token failed from shared link, attempting request to ${originalRequest.url}`,
            );
          } else if (currentBearer() != null && !isGuestSession()) {
            // Only hard-redirect a genuinely expired *session* bearer. An
            // anonymous cold-start (no bearer yet, guest token still in flight)
            // must never be bounced to /login — that races the guest-acquire and
            // strands the visitor. Routing/login-gate handles the no-bearer case.
            window.location.href = endpoints.loginPage();
          }
        } catch (err) {
          processQueue(err as AxiosError, null);
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );
}

// ---------------------------------------------------------------------------
// pk- key support for unauthenticated requests
// ---------------------------------------------------------------------------

let _publishableKey: string | undefined;

/** Set a publishable key (pk-) for unauthenticated API access */
export function setPublishableKey(key: string) {
  if (!key.startsWith('pk-')) {
    throw new Error('Publishable key must start with pk-');
  }
  _publishableKey = key;
}

/** Make a request with pk- key (no session needed) */
export async function getWithPk<T>(url: string): Promise<T> {
  if (!_publishableKey) {
    throw new Error('No publishable key set. Call setPublishableKey() first.');
  }
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${_publishableKey}` },
  });
  return response.data;
}

export default {
  get: _get,
  getResponse: _getResponse,
  post: _post,
  postMultiPart: _postMultiPart,
  postTTS: _postTTS,
  put: _put,
  delete: _delete,
  deleteWithOptions: _deleteWithOptions,
  patch: _patch,
  refreshToken,
  dispatchTokenUpdatedEvent,
  setPublishableKey,
  getWithPk,
};
