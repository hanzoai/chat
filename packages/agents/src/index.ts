// Agent utilities for Hanzo Chat

export * from './types';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const EnvVar = {
  CODE_API_KEY: 'CODE_API_KEY',
} as const;

export const Providers = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  AZURE: 'azure',
  BEDROCK: 'bedrock',
  VERTEXAI: 'vertexai',
  XAI: 'xai',
  OLLAMA: 'ollama',
  DEEPSEEK: 'deepseek',
  OPENROUTER: 'openrouter',
} as const;

export const GraphEvents = {
  START: 'start',
  END: 'end',
  ERROR: 'error',
  MESSAGE: 'message',
  TOOL_END: 'tool_end',
  ON_RUN_STEP: 'on_run_step',
  ON_MESSAGE_DELTA: 'on_message_delta',
  ON_REASONING_DELTA: 'on_reasoning_delta',
} as const;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SplitStreamHandlerOptions {
  // Add specific options as needed
}

export class SplitStreamHandler {
  constructor(_options?: SplitStreamHandlerOptions) {
    // Basic implementation
  }

  async handle(stream: unknown) {
    // Basic implementation
    return stream;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomOpenAIClientOptions {
  // Add specific options as needed
}

export class CustomOpenAIClient {
  constructor(_options?: CustomOpenAIClientOptions) {
    // Basic implementation
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ContentAggregatorOptions {
  // Add specific options as needed
}

export const createContentAggregator = (_options?: ContentAggregatorOptions) => {
  return {
    aggregate: <T>(content: T) => content,
  };
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CodeExecutionToolOptions {
  // Add specific options as needed
}

export const createCodeExecutionTool = (_options?: CodeExecutionToolOptions) => {
  return {
    name: 'code_execution',
    description: 'Execute code',
    execute: async (_code: string) => {
      return `Code execution not implemented`;
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SearchToolOptions {
  // Add specific options as needed
}

export const createSearchTool = (_options?: SearchToolOptions) => {
  return {
    name: 'search',
    description: 'Search the web',
    execute: async (_query: string) => {
      return `Search not implemented`;
    },
  };
};

export class Run {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;

  constructor(options: Partial<Run> = {}) {
    this.id = options.id || Date.now().toString();
    this.status = options.status || 'pending';
    this.created_at = options.created_at || new Date().toISOString();
    this.updated_at = options.updated_at || new Date().toISOString();
    this.metadata = options.metadata || {};
  }

  static async create(options: Partial<Run>) {
    return new Run(options);
  }

  async start() {
    this.status = 'running';
    this.updated_at = new Date().toISOString();
  }

  async complete(output?: unknown) {
    this.status = 'completed';
    this.updated_at = new Date().toISOString();
    return { run: this, output };
  }

  async fail(error: Error) {
    this.status = 'failed';
    this.updated_at = new Date().toISOString();
    return { run: this, error };
  }
}
