import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { TUser } from '@hanzochat/data-provider';
import type { TokenMethods } from '@hanzochat/data-schemas';
import type { FlowStateManager } from '~/flow/manager';
import type { MCPOAuthTokens } from './oauth/types';
import type * as t from './types';
import { MCPConnection } from './connection';
export declare class MCPManager {
    private static instance;
    /** App-level connections initialized at startup */
    private connections;
    /** User-specific connections initialized on demand */
    private userConnections;
    /** Last activity timestamp for users (not per server) */
    private userLastActivity;
    private readonly USER_CONNECTION_IDLE_TIMEOUT;
    private mcpConfigs;
    /** Store MCP server instructions */
    private serverInstructions;
    static getInstance(): MCPManager;
    /** Stores configs and initializes app-level connections */
    initializeMCP({ mcpServers, flowManager, tokenMethods, }: {
        mcpServers: t.MCPServers;
        flowManager: FlowStateManager<MCPOAuthTokens | null>;
        tokenMethods?: TokenMethods;
    }): Promise<void>;
    /** Generic server initialization logic */
    private initializeServer;
    private isOAuthError;
    /** Check for and disconnect idle connections */
    private checkIdleConnections;
    /** Updates the last activity timestamp for a user */
    private updateUserLastActivity;
    /** Gets or creates a connection for a specific user */
    getUserConnection({ user, serverName, flowManager, customUserVars, tokenMethods, oauthStart, oauthEnd, signal, }: {
        user: TUser;
        serverName: string;
        flowManager: FlowStateManager<MCPOAuthTokens | null>;
        customUserVars?: Record<string, string>;
        tokenMethods?: TokenMethods;
        oauthStart?: (authURL: string) => Promise<void>;
        oauthEnd?: () => Promise<void>;
        signal?: AbortSignal;
    }): Promise<MCPConnection>;
    /** Removes a specific user connection entry */
    private removeUserConnection;
    /** Disconnects and removes a specific user connection */
    disconnectUserConnection(userId: string, serverName: string): Promise<void>;
    /** Disconnects and removes all connections for a specific user */
    disconnectUserConnections(userId: string): Promise<void>;
    /** Returns the app-level connection (used for mapping tools, etc.) */
    getConnection(serverName: string): MCPConnection | undefined;
    /** Returns all app-level connections */
    getAllConnections(): Map<string, MCPConnection>;
    /** Attempts to reconnect an app-level connection if it's disconnected */
    private isConnectionActive;
    /**
     * Maps available tools from all app-level connections into the provided object.
     * The object is modified in place.
     */
    mapAvailableTools(availableTools: t.LCAvailableTools, flowManager: FlowStateManager<MCPOAuthTokens | null>): Promise<void>;
    /**
     * Loads tools from all app-level connections into the manifest.
     */
    loadManifestTools({ flowManager, serverToolsCallback, getServerTools, }: {
        flowManager: FlowStateManager<MCPOAuthTokens | null>;
        serverToolsCallback?: (serverName: string, tools: t.LCManifestTool[]) => Promise<void>;
        getServerTools?: (serverName: string) => Promise<t.LCManifestTool[] | undefined>;
    }): Promise<t.LCToolManifest>;
    /**
     * Calls a tool on an MCP server, using either a user-specific connection
     * (if userId is provided) or an app-level connection. Updates the last activity timestamp
     * for user-specific connections upon successful call initiation.
     */
    callTool({ user, serverName, toolName, provider, toolArguments, options, tokenMethods, flowManager, oauthStart, oauthEnd, customUserVars, }: {
        user?: TUser;
        serverName: string;
        toolName: string;
        provider: t.Provider;
        toolArguments?: Record<string, unknown>;
        options?: RequestOptions;
        tokenMethods?: TokenMethods;
        customUserVars?: Record<string, string>;
        flowManager: FlowStateManager<MCPOAuthTokens | null>;
        oauthStart?: (authURL: string) => Promise<void>;
        oauthEnd?: () => Promise<void>;
    }): Promise<t.FormattedToolResponse>;
    /** Disconnects a specific app-level server */
    disconnectServer(serverName: string): Promise<void>;
    /** Disconnects all app-level and user-level connections */
    disconnectAll(): Promise<void>;
    /** Destroys the singleton instance and disconnects all connections */
    static destroyInstance(): Promise<void>;
    /**
     * Get instructions for MCP servers
     * @param serverNames Optional array of server names. If not provided or empty, returns all servers.
     * @returns Object mapping server names to their instructions
     */
    getInstructions(serverNames?: string[]): Record<string, string>;
    /**
     * Format MCP server instructions for injection into context
     * @param serverNames Optional array of server names to include. If not provided, includes all servers.
     * @returns Formatted instructions string ready for context injection
     */
    formatInstructionsForContext(serverNames?: string[]): string;
    /** Handles OAuth authentication requirements */
    private handleOAuthRequired;
}
