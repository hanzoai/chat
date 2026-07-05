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
    allowedAddresses?: string[] | null;
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
    private agents;
    private readonly userId?;
    private lastPingTime;
    private lastConnectionCheckAt;
    private oauthTokens?;
    private requestHeaders?;
    private oauthRequired;
    private oauthRecovery;
    private readonly useSSRFProtection;
    private readonly allowedAddresses?;
    private readonly proxyConfig?;
    iconPath?: string;
    timeout?: number;
    sseReadTimeout?: number;
    url?: string;
    /**
     * Timestamp when this connection was created.
     * Used to detect if connection is stale compared to updated config.
     */
    readonly createdAt: number;
    private static circuitBreakers;
    static clearCooldown(serverName: string): void;
    private getCircuitBreaker;
    private isCircuitOpen;
    private recordCycle;
    private recordFailedRound;
    private resetFailedRounds;
    static decrementCycleCount(serverName: string): void;
    setRequestHeaders(headers: Record<string, string> | null): void;
    getRequestHeaders(): Record<string, string> | null | undefined;
    constructor(params: MCPConnectionParams);
    /** Helper to generate consistent log prefixes */
    private getLogPrefix;
    /**
     * Factory function to create fetch functions without capturing the entire `this` context.
     * This helps prevent memory leaks by only passing necessary dependencies.
     *
     * When `sseBodyTimeout` is provided, a second Agent is created with a much longer
     * body timeout for GET requests (the Streamable HTTP SSE stream). POST requests
     * continue using the normal timeout so they fail fast on real errors.
     */
    private createFetchFunction;
    private emitError;
    private constructTransport;
    private setupEventListeners;
    private handleReconnection;
    private subscribeToResources;
    connectClient(): Promise<void>;
    private patchTransportSend;
    private setupTransportOnMessageHandler;
    connect(): Promise<void>;
    private setupTransportErrorHandlers;
    private closeAgents;
    disconnect(resetCycleTracking?: boolean): Promise<void>;
    fetchResources(): Promise<t.MCPResource[]>;
    fetchTools(): Promise<{
        name: string;
        inputSchema: {
            type: "object";
            required?: string[] | undefined;
            properties?: Record<string, object> | undefined;
        };
        _meta?: Record<string, unknown> | undefined;
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
        }[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        outputSchema?: {
            type: "object";
            required?: string[] | undefined;
            properties?: Record<string, object> | undefined;
            additionalProperties?: boolean | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
        } | undefined;
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