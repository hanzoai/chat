// Type definitions for @hanzochat/agents

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  headers?: Record<string, string>;
}

export interface OpenAIClientOptions extends ClientOptions {
  defaultQuery?: Record<string, any>;
  defaultHeaders?: Record<string, any>;
  dangerouslyAllowBrowser?: boolean;
  maxRetries?: number;
  timeout?: number;
  httpAgent?: any;
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
  handle: (event: any) => void | Promise<void>;
}

export interface GenericTool {
  name: string;
  description?: string;
  func?: (input: any) => Promise<any>;
  schema?: any;
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
  result: any;
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
  messages: any[];
  [key: string]: any;
}

export interface Run {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface RunResponse {
  run: Run;
  output?: any;
  error?: Error;
}

export interface SystemMessageInput {
  content: string;
  role?: 'system';
}