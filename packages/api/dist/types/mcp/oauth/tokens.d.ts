import type { OAuthTokens, OAuthClientInformation } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { TokenMethods, IToken } from '@hanzochat/data-schemas';
import type { MCPOAuthTokens, ExtendedOAuthTokens } from './types';
interface StoreTokensParams {
    userId: string;
    serverName: string;
    tokens: OAuthTokens | ExtendedOAuthTokens | MCPOAuthTokens;
    createToken: TokenMethods['createToken'];
    updateToken?: TokenMethods['updateToken'];
    findToken?: TokenMethods['findToken'];
    clientInfo?: OAuthClientInformation;
    /** Optional: Pass existing token state to avoid duplicate DB calls */
    existingTokens?: {
        accessToken?: IToken | null;
        refreshToken?: IToken | null;
        clientInfoToken?: IToken | null;
    };
}
interface GetTokensParams {
    userId: string;
    serverName: string;
    findToken: TokenMethods['findToken'];
    refreshTokens?: (refreshToken: string, metadata: {
        userId: string;
        serverName: string;
        identifier: string;
    }) => Promise<MCPOAuthTokens>;
    createToken?: TokenMethods['createToken'];
    updateToken?: TokenMethods['updateToken'];
}
export declare class MCPTokenStorage {
    static getLogPrefix(userId: string, serverName: string): string;
    /**
     * Stores OAuth tokens for an MCP server
     *
     * @param params.existingTokens - Optional: Pass existing token state to avoid duplicate DB calls.
     * This is useful when refreshing tokens, as getTokens() already has the token state.
     */
    static storeTokens({ userId, serverName, tokens, createToken, updateToken, findToken, clientInfo, existingTokens, }: StoreTokensParams): Promise<void>;
    /**
     * Retrieves OAuth tokens for an MCP server
     */
    static getTokens({ userId, serverName, findToken, createToken, updateToken, refreshTokens, }: GetTokensParams): Promise<MCPOAuthTokens | null>;
}
export {};
