/**
 * HTTP request layer for Hanzo Cloud Gateway.
 *
 * Handles:
 * - Response unwrapping: gateway returns { status: "ok", data: X } → X
 * - Session-based auth (cookies) with fallback to Bearer token
 * - Auto-retry on session expiry via /api/get-account
 * - pk- key support for unauthenticated requests
 */
import { AxiosRequestConfig } from 'axios';
import type * as t from './types';
declare function _get<T>(url: string, options?: AxiosRequestConfig): Promise<T>;
declare function _getResponse<T>(url: string, options?: AxiosRequestConfig): Promise<T>;
declare function _post(url: string, data?: any): Promise<any>;
declare function _postMultiPart(url: string, formData: FormData, options?: AxiosRequestConfig): Promise<any>;
declare function _postTTS(url: string, formData: FormData, options?: AxiosRequestConfig): Promise<any>;
declare function _put(url: string, data?: any): Promise<any>;
declare function _delete<T>(url: string): Promise<T>;
declare function _deleteWithOptions<T>(url: string, options?: AxiosRequestConfig): Promise<T>;
declare function _patch(url: string, data?: any): Promise<any>;
/** Set a publishable key (pk-) for unauthenticated API access */
export declare function setPublishableKey(key: string): void;
/** Make a request with pk- key (no session needed) */
export declare function getWithPk<T>(url: string): Promise<T>;
declare const _default: {
    get: typeof _get;
    getResponse: typeof _getResponse;
    post: typeof _post;
    postMultiPart: typeof _postMultiPart;
    postTTS: typeof _postTTS;
    put: typeof _put;
    delete: typeof _delete;
    deleteWithOptions: typeof _deleteWithOptions;
    patch: typeof _patch;
    refreshToken: (retry?: boolean) => Promise<t.TRefreshTokenResponse | undefined>;
    refreshSession: () => Promise<any>;
    dispatchTokenUpdatedEvent: (token: string) => void;
    setPublishableKey: typeof setPublishableKey;
    getWithPk: typeof getWithPk;
};
export default _default;
