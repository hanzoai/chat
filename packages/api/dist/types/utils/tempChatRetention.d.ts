import type { TCustomConfig } from '@hanzochat/data-provider';
/**
 * Default retention period for temporary chats in hours
 */
export declare const DEFAULT_RETENTION_HOURS: number;
/**
 * Minimum allowed retention period in hours
 */
export declare const MIN_RETENTION_HOURS = 1;
/**
 * Maximum allowed retention period in hours (1 year = 8760 hours)
 */
export declare const MAX_RETENTION_HOURS = 8760;
/**
 * Gets the temporary chat retention period from environment variables or config
 * @param config - The custom configuration object
 * @returns The retention period in hours
 */
export declare function getTempChatRetentionHours(config?: Partial<TCustomConfig> | null): number;
/**
 * Creates an expiration date for temporary chats
 * @param config - The custom configuration object
 * @returns The expiration date
 */
export declare function createTempChatExpirationDate(config?: Partial<TCustomConfig>): Date;
