import type { TUser, MCPOptions } from '@hanzochat/data-provider';
/**
 * Recursively processes an object to replace environment variables in string values
 * @param obj - The object to process
 * @param user - The user object containing all user fields
 * @param customUserVars - vars that user set in settings
 * @returns - The processed object with environment variables replaced
 */
export declare function processMCPEnv(obj: Readonly<MCPOptions>, user?: TUser, customUserVars?: Record<string, string>): MCPOptions;
/**
 * Resolves header values by replacing user placeholders, custom variables, and environment variables
 * @param headers - The headers object to process
 * @param user - Optional user object for replacing user field placeholders (can be partial with just id)
 * @param customUserVars - Optional custom user variables to replace placeholders
 * @returns - The processed headers with all placeholders replaced
 */
export declare function resolveHeaders(headers: Record<string, string> | undefined, user?: Partial<TUser> | {
    id: string;
}, customUserVars?: Record<string, string>): {
    [x: string]: string;
};
