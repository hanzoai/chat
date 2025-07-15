import type { TCustomConfig, TAgentsEndpoint } from '@hanzochat/data-provider';
/**
 * Sets up the Agents configuration from the config (`chat.yaml`) file.
 * If no agents config is defined, uses the provided defaults or parses empty object.
 *
 * @param config - The loaded custom configuration.
 * @param [defaultConfig] - Default configuration from getConfigDefaults.
 * @returns The Agents endpoint configuration.
 */
export declare function agentsConfigSetup(config: TCustomConfig, defaultConfig: Partial<TAgentsEndpoint>): Partial<TAgentsEndpoint>;
