import { Keyv } from 'keyv';
import type { StoredDataNoRaw } from 'keyv';
import type { FlowState, FlowMetadata, FlowManagerOptions } from './types';
export declare class FlowStateManager<T = unknown> {
    private keyv;
    private ttl;
    private intervals;
    constructor(store: Keyv, options?: FlowManagerOptions);
    private setupCleanupHandlers;
    private getFlowKey;
    /**
     * Normalizes an expiration timestamp to milliseconds.
     * Detects whether the input is in seconds or milliseconds based on magnitude.
     * Timestamps below 10 billion are assumed to be in seconds (valid until ~2286).
     * @param timestamp - The expiration timestamp (in seconds or milliseconds)
     * @returns The timestamp normalized to milliseconds
     */
    private normalizeExpirationTimestamp;
    /**
     * Checks if a flow's token has expired based on its expires_at field
     * @param flowState - The flow state to check
     * @returns true if the token has expired, false otherwise (including if no expires_at exists)
     */
    private isTokenExpired;
    /**
     * Creates a new flow and waits for its completion
     */
    createFlow(flowId: string, type: string, metadata?: FlowMetadata, signal?: AbortSignal): Promise<T>;
    private monitorFlow;
    /**
     * Completes a flow successfully
     */
    completeFlow(flowId: string, type: string, result: T): Promise<boolean>;
    /**
     * Checks if a flow is stale based on its age and status
     * @param flowId - The flow identifier
     * @param type - The flow type
     * @param staleThresholdMs - Age in milliseconds after which a non-pending flow is considered stale (default: 2 minutes)
     * @returns Object with isStale boolean and age in milliseconds
     */
    isFlowStale(flowId: string, type: string, staleThresholdMs?: number): Promise<{
        isStale: boolean;
        age: number;
        status?: string;
    }>;
    /**
     * Marks a flow as failed
     */
    failFlow(flowId: string, type: string, error: Error | string): Promise<boolean>;
    /**
     * Gets current flow state
     */
    getFlowState(flowId: string, type: string): Promise<StoredDataNoRaw<FlowState<T>> | null>;
    /**
     * Creates a new flow and waits for its completion, only executing the handler if no existing flow is found
     * @param flowId - The ID of the flow
     * @param type - The type of flow
     * @param handler - Async function to execute if no existing flow is found
     * @param signal - Optional AbortSignal to cancel the flow
     */
    createFlowWithHandler(flowId: string, type: string, handler: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    /**
     * Deletes a flow state
     */
    deleteFlow(flowId: string, type: string): Promise<boolean>;
}
//# sourceMappingURL=manager.d.ts.map