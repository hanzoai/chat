import type { Providers } from '@hanzochat/agents';
import type { AgentModelParameters } from '@hanzochat/data-provider';
import type { OpenAIConfiguration } from './openai';

export type RunLLMConfig = {
  provider: Providers;
  streaming: boolean;
  streamUsage: boolean;
  usage?: boolean;
  configuration?: OpenAIConfiguration;
} & AgentModelParameters;
