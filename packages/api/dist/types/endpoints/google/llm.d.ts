import { Providers } from '@librechat/agents';
import type { GoogleAIToolType } from '@langchain/google-common';
import type * as t from '~/types';
/** Known Google/Vertex AI parameters that map directly to the client config */
export declare const knownGoogleParams: Set<string>;
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
export declare function getGoogleConfig(credentials: string | t.GoogleCredentials | undefined, options?: t.GoogleConfigOptions, acceptRawApiKey?: boolean): {
    /** @type {GoogleAIToolType[]} */
    tools: GoogleAIToolType[];
    /** @type {Providers.GOOGLE | Providers.VERTEXAI} */
    provider: Providers.VERTEXAI | Providers.GOOGLE;
    /** @type {GoogleClientOptions | VertexAIClientOptions} */
    llmConfig: import("@langchain/google-vertexai").ChatVertexAIInput;
};
//# sourceMappingURL=llm.d.ts.map