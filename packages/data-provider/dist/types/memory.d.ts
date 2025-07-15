import type { TCustomConfig, TMemoryConfig } from './config';
/**
 * Loads the memory configuration and validates it
 * @param config - The memory configuration from chat.yaml
 * @returns The validated memory configuration
 */
export declare function loadMemoryConfig(config: TCustomConfig['memory']): TMemoryConfig | undefined;
/**
 * Checks if memory feature is enabled based on the configuration
 * @param config - The memory configuration
 * @returns True if memory is enabled, false otherwise
 */
export declare function isMemoryEnabled(config: TMemoryConfig | undefined): boolean;
