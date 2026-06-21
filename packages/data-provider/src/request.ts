/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP request layer for the Hanzo Chat (LibreChat-native) backend.
 *
 * - Talks to the same-origin `/api/*` REST surface.
 * - Auth is JWT Bearer (set via setTokenHeader) plus the httpOnly `refreshToken`
 *   cookie; `withCredentials: true` ensures that cookie is sent so the silent
 *   refresh against `POST /api/auth/refresh` can mint a fresh access token.
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
      if (originalRequest.url?.includes('/api/auth/2fa') === true) {
        return Promise.reject(error);
      }
      if (originalRequest.url?.includes('/api/auth/logout') === true) {
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
          const response = await refreshToken(
            // Edge case: avoid a blank screen if the initial 401 is itself a refresh request.
            originalRequest.url?.includes('api/auth/refresh') === true ? true : false,
          );

          const token = response?.token ?? '';

          if (token) {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            dispatchTokenUpdatedEvent(token);
            processQueue(null, token);
            return await axios(originalRequest);
          } else if (window.location.href.includes('share/')) {
            console.log(
              `Refresh token failed from shared link, attempting request to ${originalRequest.url}`,
            );
          } else {
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
