import { Run, Providers } from '@librechat/agents';
import type { BaseMessage } from '@langchain/core/messages';
import type { LCToolRegistry, GenericTool, RunConfig, IState, LCTool } from '@librechat/agents';
import type { IUser } from '@librechat/data-schemas';
import type { Agent } from 'librechat-data-provider';
import type * as t from '~/types';
/**
 * Extracts discovered tool names from message history by parsing tool_search results.
 * When the LLM calls tool_search, the result contains tool names that were discovered.
 * These tools should have defer_loading overridden to false on subsequent turns.
 *
 * Supports both:
 * - New JSON format: { "tools": [{ "name": "tool_name" }] }
 * - Legacy text format: "- tool_name (score: X.XX)"
 *
 * @param messages - The conversation message history
 * @returns Set of tool names that were discovered via tool_search
 */
export declare function extractDiscoveredToolsFromHistory(messages: BaseMessage[]): Set<string>;
/**
 * Overrides defer_loading to false for tools that were already discovered via tool_search.
 * This prevents the LLM from having to re-discover tools on every turn.
 *
 * @param toolRegistry - The tool registry to modify (mutated in place)
 * @param discoveredTools - Set of tool names that were previously discovered
 * @returns Number of tools that had defer_loading overridden
 */
export declare function overrideDeferLoadingForDiscoveredTools(toolRegistry: LCToolRegistry, discoveredTools: Set<string>): number;
export declare function getReasoningKey(provider: Providers, llmConfig: t.RunLLMConfig, agentEndpoint?: string | null): 'reasoning_content' | 'reasoning';
type RunAgent = Omit<Agent, 'tools'> & {
    tools?: GenericTool[];
    maxContextTokens?: number;
    useLegacyContent?: boolean;
    toolContextMap?: Record<string, string>;
    toolRegistry?: LCToolRegistry;
    /** Serializable tool definitions for event-driven execution */
    toolDefinitions?: LCTool[];
    /** Precomputed flag indicating if any tools have defer_loading enabled */
    hasDeferredTools?: boolean;
};
/**
 * Creates a new Run instance with custom handlers and configuration.
 *
 * @param options - The options for creating the Run instance.
 * @param options.agents - The agents for this run.
 * @param options.signal - The signal for this run.
 * @param options.runId - Optional run ID; otherwise, a new run ID will be generated.
 * @param options.customHandlers - Custom event handlers.
 * @param options.streaming - Whether to use streaming.
 * @param options.streamUsage - Whether to stream usage information.
 * @param options.messages - Optional message history to extract discovered tools from.
 *   When provided, tools that were previously discovered via tool_search will have
 *   their defer_loading overridden to false, preventing redundant re-discovery.
 * @returns {Promise<Run<IState>>} A promise that resolves to a new Run instance.
 */
export declare function createRun({ runId, signal, agents, messages, requestBody, user, tokenCounter, customHandlers, indexTokenCountMap, streaming, streamUsage, }: {
    agents: RunAgent[];
    signal: AbortSignal;
    runId?: string;
    streaming?: boolean;
    streamUsage?: boolean;
    requestBody?: t.RequestBody;
    user?: IUser;
    /** Message history for extracting previously discovered tools */
    messages?: BaseMessage[];
} & Pick<RunConfig, 'tokenCounter' | 'customHandlers' | 'indexTokenCountMap'>): Promise<Run<IState>>;
export {};
//# sourceMappingURL=run.d.ts.map