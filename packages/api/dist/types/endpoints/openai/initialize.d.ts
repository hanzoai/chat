import type { BaseInitializeParams, InitializeResultBase } from '~/types';
/**
 * Initializes OpenAI options for agent usage. This function always returns configuration
 * options and never creates a client instance (equivalent to optionsOnly=true behavior).
 *
 * @param params - Configuration parameters
 * @returns Promise resolving to OpenAI configuration options
 * @throws Error if API key is missing or user key has expired
 */
export declare function initializeOpenAI({ req, endpoint, model_parameters, db, }: BaseInitializeParams): Promise<InitializeResultBase>;
//# sourceMappingURL=initialize.d.ts.map