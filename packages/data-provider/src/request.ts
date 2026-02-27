/**
 * HTTP request layer for Hanzo Cloud Gateway.
 *
 * Handles:
 * - Response unwrapping: gateway returns { status: "ok", data: X } → X
 * - Session-based auth (cookies) with fallback to Bearer token
 * - Auto-retry on session expiry via /api/get-account
 * - pk- key support for unauthenticated requests
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as endpoints from './api-endpoints';
import { setTokenHeader } from './headers-helpers';
import type * as t from './types';

// ---------------------------------------------------------------------------
// Cloud Gateway response unwrapper
// ---------------------------------------------------------------------------

/**
 * The cloud gateway wraps all responses:
 *   { status: "ok", data: <payload>, data2?: <count> }
 *   { status: "error", msg: "..." }
 *
 * This interceptor unwraps successful responses to return `data` directly,
 * which is what the frontend components expect.
 */
axios.interceptors.response.use(
  (response) => {
    const body = response.data;

    // If the response has the gateway wrapper format, unwrap it
    if (body && typeof body === 'object' && 'status' in body) {
      if (body.status === 'ok') {
        // Preserve pagination info if present
        if (body.data2 !== undefined) {
          response.data = body.data;
          (response as any)._totalCount = body.data2;
        } else {
          response.data = body.data;
        }
      } else if (body.status === 'error') {
        // Convert gateway error to rejection
        const error = new Error(body.msg || 'Unknown error');
        (error as any).response = response;
        return Promise.reject(error);
      }
    }

    return response;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Request methods
// ---------------------------------------------------------------------------

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

/**
 * Refresh session by calling get-account.
 * Cloud gateway uses server-side sessions (cookies), so this just
 * validates the session is still alive and returns fresh user data.
 */
const refreshSession = (): Promise<any> => _get(endpoints.getAccount());

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

// Auto-retry on 401 (session expired)
if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!error.response) {
        return Promise.reject(error);
      }

      // Don't retry auth endpoints
      if (originalRequest.url?.includes('/api/signin') === true) {
        return Promise.reject(error);
      }
      if (originalRequest.url?.includes('/api/signout') === true) {
        return Promise.reject(error);
      }
      if (originalRequest.url?.includes('/api/get-account') === true && originalRequest._retry) {
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
          const accountData = await refreshSession();

          // If session is still valid, the cookie is refreshed automatically
          // Extract access token if present
          const token = accountData?.accessToken ?? accountData?.AccessToken ?? '';

          if (token) {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            dispatchTokenUpdatedEvent(token);
            processQueue(null, token);
            return await axios(originalRequest);
          } else if (accountData) {
            // Session cookie is valid, just retry
            processQueue(null, null);
            return await axios(originalRequest);
          } else if (window.location.href.includes('share/')) {
            console.log('Session expired on shared link, attempting request anyway');
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

// Legacy compat: refreshToken calls refreshSession internally
const refreshToken = (retry?: boolean): Promise<t.TRefreshTokenResponse | undefined> =>
  refreshSession() as any;

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
  refreshSession,
  dispatchTokenUpdatedEvent,
  setPublishableKey,
  getWithPk,
};
