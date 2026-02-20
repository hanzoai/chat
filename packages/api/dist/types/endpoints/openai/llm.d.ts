import { EModelEndpoint } from 'librechat-data-provider';
import type { SettingDefinition } from 'librechat-data-provider';
import type * as t from '~/types';
export declare const knownOpenAIParams: Set<string>;
/**
 * Extracts default parameters from customParams.paramDefinitions
 * @param paramDefinitions - Array of parameter definitions with key and default values
 * @returns Record of default parameters
 */
export declare function extractDefaultParams(paramDefinitions?: Partial<SettingDefinition>[]): Record<string, unknown> | undefined;
/**
 * Applies default parameters to the target object only if the field is undefined
 * @param target - The target object to apply defaults to
 * @param defaults - Record of default parameter values
 */
export declare function applyDefaultParams(target: Record<string, unknown>, defaults: Record<string, unknown>): void;
export declare function getOpenAILLMConfig({ azure, apiKey, baseURL, endpoint, streaming, addParams, dropParams, defaultParams, useOpenRouter, modelOptions: _modelOptions, }: {
    apiKey: string;
    streaming: boolean;
    baseURL?: string | null;
    endpoint?: EModelEndpoint | string | null;
    modelOptions: Partial<t.OpenAIParameters>;
    addParams?: Record<string, unknown>;
    dropParams?: string[];
    defaultParams?: Record<string, unknown>;
    useOpenRouter?: boolean;
    azure?: false | t.AzureOptions;
}): Pick<t.LLMConfigResult, 'llmConfig' | 'tools'> & {
    azure?: t.AzureOptions;
};
//# sourceMappingURL=llm.d.ts.map