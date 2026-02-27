export declare function setAcceptLanguageHeader(value: string): void;
export declare function setTokenHeader(token: string): void;
/**
 * Set a publishable key (pk-) as the default auth header.
 * Used for unauthenticated access (model listing, health checks).
 */
export declare function setPublishableKeyHeader(key: string): void;
/**
 * Enable cross-origin credentials for cloud gateway requests.
 * Required when frontend (hanzo.chat) talks to api.hanzo.ai.
 */
export declare function enableCrossOriginCredentials(): void;
