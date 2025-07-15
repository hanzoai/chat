import type { GoogleClientOptions, VertexAIClientOptions } from '@hanzochat/agents';
import type * as t from '~/types';
export declare function getSafetySettings(model?: string): Array<{
    category: string;
    threshold: string;
}> | undefined;
/**
 * Replicates core logic from GoogleClient's constructor and setOptions, plus client determination.
 * Returns an object with the provider label and the final options that would be passed to createLLM.
 *
 * @param credentials - Either a JSON string or an object containing Google keys
 * @param options - The same shape as the "GoogleClient" constructor options
 */
export declare function getGoogleConfig(credentials: string | t.GoogleCredentials | undefined, options?: t.GoogleConfigOptions): {
    /** @type {Providers.GOOGLE | Providers.VERTEXAI} */
    provider: "google" | "vertexai";
    /** @type {GoogleClientOptions | VertexAIClientOptions} */
    llmConfig: GoogleClientOptions | VertexAIClientOptions;
};
