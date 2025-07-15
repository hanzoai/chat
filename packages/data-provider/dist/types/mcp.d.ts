import { z } from 'zod';
import { TokenExchangeMethodEnum } from './types/agents';
export declare const StdioOptionsSchema: z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>;
export declare const WebSocketOptionsSchema: z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>;
export declare const SSEOptionsSchema: z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>;
export declare const StreamableHTTPOptionsSchema: z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    type: z.ZodLiteral<"streamable-http">;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>;
export declare const MCPOptionsSchema: z.ZodUnion<[z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    type: z.ZodLiteral<"streamable-http">;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>]>;
export declare const MCPServersSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "stdio" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    env?: Record<string, string> | undefined;
    stderr?: any;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "websocket" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    type?: "sse" | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    }, {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
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
    type: z.ZodLiteral<"streamable-http">;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    url: z.ZodEffects<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, string, string>;
}, "strip", z.ZodTypeAny, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}, {
    type: "streamable-http";
    url: string;
    iconPath?: string | undefined;
    timeout?: number | undefined;
    initTimeout?: number | undefined;
    chatMenu?: boolean | undefined;
    serverInstructions?: string | boolean | undefined;
    oauth?: {
        authorization_url?: string | undefined;
        token_url?: string | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
        redirect_uri?: string | undefined;
        token_exchange_method?: TokenExchangeMethodEnum | undefined;
    } | undefined;
    customUserVars?: Record<string, {
        title: string;
        description: string;
    }> | undefined;
    headers?: Record<string, string> | undefined;
}>]>>;
export type MCPOptions = z.infer<typeof MCPOptionsSchema>;
