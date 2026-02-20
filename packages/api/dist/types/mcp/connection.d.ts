import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { MCPOAuthTokens } from './oauth/types';
import type * as t from './types';
interface MCPConnectionParams {
    serverName: string;
    serverConfig: t.MCPOptions;
    userId?: string;
    oauthTokens?: MCPOAuthTokens | null;
    useSSRFProtection?: boolean;
}
export declare class MCPConnection extends EventEmitter {
    client: Client;
    private options;
    private transport;
    private connectionState;
    private connectPromise;
    private readonly MAX_RECONNECT_ATTEMPTS;
    readonly serverName: string;
    private shouldStopReconnecting;
    private isReconnecting;
    private isInitializing;
    private reconnectAttempts;
    private readonly userId?;
    private lastPingTime;
    private lastConnectionCheckAt;
    private oauthTokens?;
    private requestHeaders?;
    private oauthRequired;
    private readonly useSSRFProtection;
    iconPath?: string;
    timeout?: number;
    url?: string;
    /**
     * Timestamp when this connection was created.
     * Used to detect if connection is stale compared to updated config.
     */
    readonly createdAt: number;
    setRequestHeaders(headers: Record<string, string> | null): void;
    getRequestHeaders(): Record<string, string> | null | undefined;
    constructor(params: MCPConnectionParams);
    /** Helper to generate consistent log prefixes */
    private getLogPrefix;
    /**
     * Factory function to create fetch functions without capturing the entire `this` context.
     * This helps prevent memory leaks by only passing necessary dependencies.
     *
     * @param getHeaders Function to retrieve request headers
     * @param timeout Timeout value for the agent (in milliseconds)
     * @returns A fetch function that merges headers appropriately
     */
    private createFetchFunction;
    private emitError;
    private constructTransport;
    private setupEventListeners;
    private handleReconnection;
    private subscribeToResources;
    connectClient(): Promise<void>;
    private setupTransportDebugHandlers;
    connect(): Promise<void>;
    private setupTransportErrorHandlers;
    disconnect(): Promise<void>;
    fetchResources(): Promise<t.MCPResource[]>;
    fetchTools(): Promise<{
        inputSchema: {
            [x: string]: unknown;
            type: "object";
            properties?: Record<string, object> | undefined;
            required?: string[] | undefined;
        };
        name: string;
        description?: string | undefined;
        outputSchema?: {
            [x: string]: unknown;
            type: "object";
            properties?: Record<string, object> | undefined;
            required?: string[] | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
        } | undefined;
        execution?: {
            taskSupport?: "optional" | "required" | "forbidden" | undefined;
        } | undefined;
        _meta?: Record<string, unknown> | undefined;
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
            theme?: "light" | "dark" | undefined;
        }[] | undefined;
        title?: string | undefined;
    }[]>;
    fetchPrompts(): Promise<t.MCPPrompt[]>;
    isConnected(): Promise<boolean>;
    setOAuthTokens(tokens: MCPOAuthTokens): void;
    /**
     * Check if this connection is stale compared to config update time.
     * A connection is stale if it was created before the config was updated.
     *
     * @param configUpdatedAt - Unix timestamp (ms) when config was last updated
     * @returns true if connection was created before config update, false otherwise
     */
    isStale(configUpdatedAt: number): boolean;
    private isOAuthError;
    /**
     * Checks if an error indicates rate limiting (HTTP 429).
     * Rate limited requests should stop reconnection attempts to avoid making the situation worse.
     */
    private isRateLimitError;
}
export {};
//# sourceMappingURL=connection.d.ts.map