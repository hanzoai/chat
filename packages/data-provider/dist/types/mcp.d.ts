import { z } from 'zod';
import { TokenExchangeMethodEnum } from './types/agents';
export declare const StdioOptionsSchema: z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    /**
     * The executable to run to start the server.
     */
    command: z.ZodString;
    /**
     * Command line arguments to pass to the executable.
     */
    args: z.ZodArray<z.ZodString, "many">;
    /**
     * The environment to use when spawning the process.
     *
     * If not specified, the result of getDefaultEnvironment() will be used.
     * Environment variables can be referenced using ${VAR_NAME} syntax.
     */
    env: z.ZodEffects<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>, Record<string, string> | undefined, Record<string, string> | undefined>;
    /**
     * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`.
     *
     * @type {import('node:child_process').IOType | import('node:stream').Stream | number}
     *
     * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
     */
    stderr: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>;
export declare const WebSocketOptionsSchema: z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"websocket">>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>;
export declare const SSEOptionsSchema: z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"sse">>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>;
export declare const StreamableHTTPOptionsSchema: z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodUnion<[z.ZodLiteral<"streamable-http">, z.ZodLiteral<"http">]>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>;
export declare const MCPOptionsSchema: z.ZodUnion<[z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    /**
     * The executable to run to start the server.
     */
    command: z.ZodString;
    /**
     * Command line arguments to pass to the executable.
     */
    args: z.ZodArray<z.ZodString, "many">;
    /**
     * The environment to use when spawning the process.
     *
     * If not specified, the result of getDefaultEnvironment() will be used.
     * Environment variables can be referenced using ${VAR_NAME} syntax.
     */
    env: z.ZodEffects<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>, Record<string, string> | undefined, Record<string, string> | undefined>;
    /**
     * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`.
     *
     * @type {import('node:child_process').IOType | import('node:stream').Stream | number}
     *
     * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
     */
    stderr: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"websocket">>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"sse">>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodUnion<[z.ZodLiteral<"streamable-http">, z.ZodLiteral<"http">]>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>]>;
export declare const MCPServersSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    /**
     * The executable to run to start the server.
     */
    command: z.ZodString;
    /**
     * Command line arguments to pass to the executable.
     */
    args: z.ZodArray<z.ZodString, "many">;
    /**
     * The environment to use when spawning the process.
     *
     * If not specified, the result of getDefaultEnvironment() will be used.
     * Environment variables can be referenced using ${VAR_NAME} syntax.
     */
    env: z.ZodEffects<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>, Record<string, string> | undefined, Record<string, string> | undefined>;
    /**
     * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`.
     *
     * @type {import('node:child_process').IOType | import('node:stream').Stream | number}
     *
     * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
     */
    stderr: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}, {
    command: string;
    args: string[];
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"websocket">>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodOptional<z.ZodLiteral<"sse">>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>, z.ZodObject<{
    /** Display name for the MCP server - only letters, numbers, and spaces allowed */
    title: z.ZodOptional<z.ZodString>;
    /** Description of the MCP server */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Controls whether the MCP server is initialized during application startup.
     * - true (default): Server is initialized during app startup and included in app-level connections
     * - false: Skips initialization at startup and excludes from app-level connections - useful for servers
     *   requiring manual authentication (e.g., GitHub PAT tokens) that need to be configured through the UI after startup
     */
    startup: z.ZodOptional<z.ZodBoolean>;
    iconPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    initTimeout: z.ZodOptional<z.ZodNumber>;
    /** Controls visibility in chat dropdown menu (MCPSelect) */
    chatMenu: z.ZodOptional<z.ZodBoolean>;
    /**
     * Controls server instruction behavior:
     * - undefined/not set: No instructions included (default)
     * - true: Use server-provided instructions
     * - string: Use custom instructions (overrides server-provided)
     */
    serverInstructions: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    /**
     * Whether this server requires OAuth authentication
     * If not specified, will be auto-detected during construction
     */
    requiresOAuth: z.ZodOptional<z.ZodBoolean>;
    /**
     * OAuth configuration for SSE and Streamable HTTP transports
     * - Optional: OAuth can be auto-discovered on 401 responses
     * - Pre-configured values will skip discovery steps
     */
    oauth: z.ZodOptional<z.ZodObject<{
        /** OAuth authorization endpoint (optional - can be auto-discovered) */
        authorization_url: z.ZodOptional<z.ZodString>;
        /** OAuth token endpoint (optional - can be auto-discovered) */
        token_url: z.ZodOptional<z.ZodString>;
        /** OAuth client ID (optional - can use dynamic registration) */
        client_id: z.ZodOptional<z.ZodString>;
        /** OAuth client secret (optional - can use dynamic registration) */
        client_secret: z.ZodOptional<z.ZodString>;
        /** OAuth scopes to request */
        scope: z.ZodOptional<z.ZodString>;
        /** OAuth redirect URI (defaults to /api/mcp/{serverName}/oauth/callback) */
        redirect_uri: z.ZodOptional<z.ZodString>;
        /** Token exchange method */
        token_exchange_method: z.ZodOptional<z.ZodNativeEnum<typeof TokenExchangeMethodEnum>>;
        /** Supported grant types (defaults to ['authorization_code', 'refresh_token']) */
        grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported token endpoint authentication methods (defaults to ['client_secret_basic', 'client_secret_post']) */
        token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported response types (defaults to ['code']) */
        response_types_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Supported code challenge methods (defaults to ['S256', 'plain']) */
        code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Skip code challenge validation and force S256 (useful for providers like AWS Cognito that support S256 but don't advertise it) */
        skip_code_challenge_check: z.ZodOptional<z.ZodBoolean>;
        /** OAuth revocation endpoint (optional - can be auto-discovered) */
        revocation_endpoint: z.ZodOptional<z.ZodString>;
        /** OAuth revocation endpoint authentication methods supported (optional - can be auto-discovered) */
        revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    }>>;
    /** Custom headers to send with OAuth requests (registration, discovery, token exchange, etc.) */
    oauth_headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * API Key authentication configuration for SSE and Streamable HTTP transports
     * - source: 'admin' means the key is provided by admin and shared by all users
     * - source: 'user' means each user provides their own key via customUserVars
     */
    apiKey: z.ZodOptional<z.ZodObject<{
        /** API key value (only for admin-provided mode, stored encrypted) */
        key: z.ZodOptional<z.ZodString>;
        /** Whether key is provided by admin or each user */
        source: z.ZodEnum<["admin", "user"]>;
        /** How to format the authorization header */
        authorization_type: z.ZodEnum<["basic", "bearer", "custom"]>;
        /** Custom header name when authorization_type is 'custom' */
        custom_header: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }, {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    }>>;
    customUserVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>>>;
} & {
    type: z.ZodUnion<[z.ZodLiteral<"streamable-http">, z.ZodLiteral<"http">]>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http" | "http";
    url: string;
    title?: string | undefined;
    description?: string | undefined;
    startup?: boolean | undefined;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    requiresOAuth?: boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
        grant_types_supported?: string[] | undefined;
        token_endpoint_auth_methods_supported?: string[] | undefined;
        response_types_supported?: string[] | undefined;
        code_challenge_methods_supported?: string[] | undefined;
        skip_code_challenge_check?: boolean | undefined;
        revocation_endpoint?: string | undefined;
        revocation_endpoint_auth_methods_supported?: string[] | undefined;
    } | undefined;
    oauth_headers?: Record<string, string> | undefined;
    apiKey?: {
        source: "admin" | "user";
        authorization_type: "custom" | "basic" | "bearer";
        key?: string | undefined;
        custom_header?: string | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>]>>;
export type MCPOptions = z.infer<typeof MCPOptionsSchema>;
/**
 * MCP Server configuration that comes from UI/API input only.
 * Omits server-managed fields like startup, timeout, customUserVars, etc.
 * Allows: title, description, url, iconPath, oauth (user credentials)
 *
 * SECURITY: Stdio transport is intentionally excluded from user input.
 * Stdio allows arbitrary command execution and should only be configured
 * by administrators via the YAML config file (librechat.yaml).
 * Only remote transports (SSE, HTTP, WebSocket) are allowed via the API.
 */
export declare const MCPServerUserInputSchema: z.ZodUnion<[z.ZodObject<Omit<z.ZodRawShape, "startup" | "timeout" | "initTimeout" | "chatMenu" | "serverInstructions" | "requiresOAuth" | "oauth_headers" | "customUserVars">, z.UnknownKeysParam, z.ZodTypeAny, {
    [x: string]: any;
    [x: number]: any;
}, {
    [x: string]: any;
    [x: number]: any;
}>, z.ZodObject<Omit<z.ZodRawShape, "startup" | "timeout" | "initTimeout" | "chatMenu" | "serverInstructions" | "requiresOAuth" | "oauth_headers" | "customUserVars">, z.UnknownKeysParam, z.ZodTypeAny, {
    [x: string]: any;
    [x: number]: any;
}, {
    [x: string]: any;
    [x: number]: any;
}>, z.ZodObject<Omit<z.ZodRawShape, "startup" | "timeout" | "initTimeout" | "chatMenu" | "serverInstructions" | "requiresOAuth" | "oauth_headers" | "customUserVars">, z.UnknownKeysParam, z.ZodTypeAny, {
    [x: string]: any;
    [x: number]: any;
}, {
    [x: string]: any;
    [x: number]: any;
}>]>;
export type MCPServerUserInput = z.infer<typeof MCPServerUserInputSchema>;
