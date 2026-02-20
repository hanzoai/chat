import type { MCPOptions } from 'librechat-data-provider';
import type { IUser } from '@librechat/data-schemas';
import type { RequestBody } from '~/types';
/**
 * List of allowed user fields that can be used in MCP environment variables.
 * These are non-sensitive string/boolean fields from the IUser interface.
 */
declare const ALLOWED_USER_FIELDS: readonly ["id", "name", "username", "email", "provider", "role", "googleId", "facebookId", "openidId", "samlId", "ldapId", "githubId", "discordId", "appleId", "emailVerified", "twoFactorEnabled", "termsAccepted"];
type AllowedUserField = (typeof ALLOWED_USER_FIELDS)[number];
type SafeUser = Pick<IUser, AllowedUserField>;
/**
 * Encodes a string value to be safe for HTTP headers.
 * HTTP headers are restricted to ASCII characters (0-255) per the Fetch API standard.
 * Non-ASCII characters with Unicode values > 255 are Base64 encoded with 'b64:' prefix.
 *
 * NOTE: This is a LibreChat-specific encoding scheme to work around Fetch API limitations.
 * MCP servers receiving headers with the 'b64:' prefix should:
 * 1. Detect the 'b64:' prefix in header values
 * 2. Remove the prefix and Base64-decode the remaining string
 * 3. Use the decoded UTF-8 string as the actual value
 *
 * Example decoding (Node.js):
 *   if (headerValue.startsWith('b64:')) {
 *     const decoded = Buffer.from(headerValue.slice(4), 'base64').toString('utf8');
 *   }
 *
 * @param value - The string value to encode
 * @returns ASCII-safe string (encoded if necessary)
 *
 * @example
 * encodeHeaderValue("José")   // Returns "José" (é = 233, safe)
 * encodeHeaderValue("Marić")  // Returns "b64:TWFyacSH" (ć = 263, needs encoding)
 */
export declare function encodeHeaderValue(value: string): string;
/**
 * Creates a safe user object containing only allowed fields.
 * Preserves federatedTokens for OpenID token template variable resolution.
 *
 * @param user - The user object to extract safe fields from
 * @returns A new object containing only allowed fields plus federatedTokens if present
 */
export declare function createSafeUser(user: IUser | null | undefined): Partial<SafeUser> & {
    federatedTokens?: unknown;
};
/**
 * Recursively processes an object to replace environment variables in string values
 * @param params - Processing parameters
 * @param params.options - The MCP options to process
 * @param params.user - The user object containing all user fields
 * @param params.customUserVars - vars that user set in settings
 * @param params.body - the body of the request that is being processed
 * @returns - The processed object with environment variables replaced
 */
export declare function processMCPEnv(params: {
    options: Readonly<MCPOptions>;
    user?: Partial<IUser>;
    customUserVars?: Record<string, string>;
    body?: RequestBody;
}): MCPOptions;
/**
 * Recursively resolves placeholders in a nested object structure while preserving types.
 * Only processes string values - leaves numbers, booleans, arrays, and nested objects intact.
 *
 * @param options - Configuration object
 * @param options.obj - The object to process
 * @param options.user - Optional user object for replacing user field placeholders
 * @param options.body - Optional request body object for replacing body field placeholders
 * @param options.customUserVars - Optional custom user variables to replace placeholders
 * @returns The processed object with placeholders replaced in string values
 */
export declare function resolveNestedObject<T = unknown>(options?: {
    obj: T | undefined;
    user?: Partial<IUser> | {
        id: string;
    };
    body?: RequestBody;
    customUserVars?: Record<string, string>;
}): T;
/**
 * Resolves header values by replacing user placeholders, body variables, custom variables, and environment variables.
 * Automatically encodes non-ASCII characters for header safety.
 *
 * @param options - Optional configuration object
 * @param options.headers - The headers object to process
 * @param options.user - Optional user object for replacing user field placeholders (can be partial with just id)
 * @param options.body - Optional request body object for replacing body field placeholders
 * @param options.customUserVars - Optional custom user variables to replace placeholders
 * @returns The processed headers with all placeholders replaced
 */
export declare function resolveHeaders(options?: {
    headers: Record<string, string> | undefined;
    user?: Partial<IUser> | {
        id: string;
    };
    body?: RequestBody;
    customUserVars?: Record<string, string>;
}): Record<string, string>;
export {};
//# sourceMappingURL=env.d.ts.map