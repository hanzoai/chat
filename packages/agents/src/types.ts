// Type definitions for @hanzochat/agents

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  headers?: Record<string, string>;
}

export interface OpenAIClientOptions extends ClientOptions {
  defaultQuery?: Record<string, unknown>;
  defaultHeaders?: Record<string, unknown>;
  dangerouslyAllowBrowser?: boolean;
  maxRetries?: number;
  timeout?: number;
  httpAgent?: unknown;
}

export interface GoogleClientOptions extends ClientOptions {
  apiVersion?: string;
  modelName?: string;
  safety_settings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface VertexAIClientOptions extends GoogleClientOptions {
  projectId: string;
  location?: string;
}

export interface EventHandler {
  name: string;
  handle: (event: unknown) => void | Promise<void>;
}

export interface GenericTool {
  name: string;
  description?: string;
  func?: (input: unknown) => Promise<unknown>;
  schema?: unknown;
}

export interface StreamEventData {
  chunk?: string;
  delta?: string;
  content?: string;
  event?: string;
}

export interface ToolEndCallback {
  (data: ToolEndData): void | Promise<void>;
}

export interface ToolEndData {
  tool: string;
  result: unknown;
  error?: Error;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface StandardGraphConfig {
  llm?: LLMConfig;
  tools?: GenericTool[];
  maxIterations?: number;
  recursionLimit?: number;
}

export interface IState {
  messages: unknown[];
  [key: string]: unknown;
}

export interface Run {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface RunResponse {
  run: Run;
  output?: unknown;
  error?: Error;
}

export interface SystemMessageInput {
  content: string;
  role?: 'system';
}
