import type { ZodIssue } from 'zod';
import type * as a from './types/assistants';
import type * as s from './schemas';
import type * as t from './types';
import { EModelEndpoint } from './schemas';
export type EndpointSchemaKey = EModelEndpoint;
/** Get the enabled endpoints from the `ENDPOINTS` environment variable */
export declare function getEnabledEndpoints(): string[];
/** Orders an existing EndpointsConfig object based on enabled endpoint/custom ordering */
export declare function orderEndpointsConfig(endpointsConfig: t.TEndpointsConfig): Record<string, t.TConfig | null | undefined>;
/** Converts an array of Zod issues into a string. */
export declare function errorsToString(errors: ZodIssue[]): string;
export declare function getFirstDefinedValue(possibleValues: string[]): string | undefined;
export declare function getNonEmptyValue(possibleValues: string[]): string | undefined;
export type TPossibleValues = {
    models: string[];
};
export declare const parseConvo: ({ endpoint, endpointType, conversation, possibleValues, defaultParamsEndpoint, }: {
    endpoint: EndpointSchemaKey;
    endpointType?: EndpointSchemaKey | null;
    conversation: Partial<s.TConversation | s.TPreset> | null;
    possibleValues?: TPossibleValues;
    defaultParamsEndpoint?: string | null;
}) => s.TConversation | undefined;
export declare const getResponseSender: (endpointOption: Partial<t.TEndpointOption>) => string;
export declare const parseCompactConvo: ({ endpoint, endpointType, conversation, possibleValues, defaultParamsEndpoint, }: {
    endpoint?: EndpointSchemaKey;
    endpointType?: EndpointSchemaKey | null;
    conversation: Partial<s.TConversation | s.TPreset>;
    possibleValues?: TPossibleValues;
    defaultParamsEndpoint?: string | null;
}) => Omit<s.TConversation, "iconURL"> | null;
export declare function parseTextParts(contentParts: Array<a.TMessageContentParts | undefined>, skipReasoning?: boolean): string;
export declare const SEPARATORS: string[];
export declare function findLastSeparatorIndex(text: string, separators?: string[]): number;
export declare function replaceSpecialVars({ text, user }: {
    text: string;
    user?: t.TUser | null;
}): string;
/**
 * Parsed ephemeral agent ID result
 */
export type ParsedEphemeralAgentId = {
    endpoint: string;
    model: string;
    sender?: string;
    index?: number;
};
/**
 * Encodes an ephemeral agent ID from endpoint, model, optional sender, and optional index.
 * Uses __ to replace : (reserved in graph node names) and ___ to separate sender.
 *
 * Format: endpoint__model___sender or endpoint__model___sender____index (if index provided)
 *
 * @example
 * encodeEphemeralAgentId({ endpoint: 'openAI', model: 'gpt-4o', sender: 'GPT-4o' })
 * // => 'openAI__gpt-4o___GPT-4o'
 *
 * @example
 * encodeEphemeralAgentId({ endpoint: 'openAI', model: 'gpt-4o', sender: 'GPT-4o', index: 1 })
 * // => 'openAI__gpt-4o___GPT-4o____1'
 */
export declare function encodeEphemeralAgentId({ endpoint, model, sender, index, }: {
    endpoint: string;
    model: string;
    sender?: string;
    index?: number;
}): string;
/**
 * Parses an ephemeral agent ID back into its components.
 * Returns undefined if the ID doesn't match the expected format.
 *
 * Format: endpoint__model___sender or endpoint__model___sender____index
 * - ____ (4 underscores) separates optional index suffix
 * - ___ (triple underscore) separates model from optional sender
 * - __ (double underscore) replaces : in endpoint/model names
 *
 * @example
 * parseEphemeralAgentId('openAI__gpt-4o___GPT-4o')
 * // => { endpoint: 'openAI', model: 'gpt-4o', sender: 'GPT-4o' }
 *
 * @example
 * parseEphemeralAgentId('openAI__gpt-4o___GPT-4o____1')
 * // => { endpoint: 'openAI', model: 'gpt-4o', sender: 'GPT-4o', index: 1 }
 */
export declare function parseEphemeralAgentId(agentId: string): ParsedEphemeralAgentId | undefined;
/**
 * Checks if an agent ID represents an ephemeral (non-saved) agent.
 * Real agent IDs always start with "agent_", so anything else is ephemeral.
 */
export declare function isEphemeralAgentId(agentId: string | null | undefined): boolean;
/**
 * Strips the index suffix (____N) from an agent ID if present.
 * Works with both ephemeral and real agent IDs.
 *
 * @example
 * stripAgentIdSuffix('agent_abc123____1') // => 'agent_abc123'
 * stripAgentIdSuffix('openAI__gpt-4o___GPT-4o____1') // => 'openAI__gpt-4o___GPT-4o'
 * stripAgentIdSuffix('agent_abc123') // => 'agent_abc123' (unchanged)
 */
export declare function stripAgentIdSuffix(agentId: string): string;
/**
 * Appends an index suffix (____N) to an agent ID.
 * Used to distinguish parallel agents with the same base ID.
 *
 * @example
 * appendAgentIdSuffix('agent_abc123', 1) // => 'agent_abc123____1'
 * appendAgentIdSuffix('openAI__gpt-4o___GPT-4o', 1) // => 'openAI__gpt-4o___GPT-4o____1'
 */
export declare function appendAgentIdSuffix(agentId: string, index: number): string;
