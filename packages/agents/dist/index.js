'use strict';
(Object.defineProperty(exports, '__esModule', { value: !0 }),
  (exports.Run =
    exports.createSearchTool =
    exports.createCodeExecutionTool =
    exports.createContentAggregator =
    exports.CustomOpenAIClient =
    exports.SplitStreamHandler =
    exports.GraphEvents =
    exports.Providers =
    exports.EnvVar =
    exports.sleep =
      void 0));
require('tslib').__exportStar(require('./types'), exports);
((exports.sleep = (e) => new Promise((t) => setTimeout(t, e))),
  (exports.EnvVar = { CODE_API_KEY: 'CODE_API_KEY' }),
  (exports.Providers = {
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
  }),
  (exports.GraphEvents = {
    START: 'start',
    END: 'end',
    ERROR: 'error',
    MESSAGE: 'message',
    TOOL_END: 'tool_end',
    ON_RUN_STEP: 'on_run_step',
    ON_MESSAGE_DELTA: 'on_message_delta',
    ON_REASONING_DELTA: 'on_reasoning_delta',
  }));
exports.SplitStreamHandler = class {
  constructor(e) {}
  async handle(e) {
    return e;
  }
};
exports.CustomOpenAIClient = class {
  constructor(e) {}
};
exports.createContentAggregator = (e) => ({ aggregate: (e) => e });
exports.createCodeExecutionTool = (e) => ({
  name: 'code_execution',
  description: 'Execute code',
  execute: async (e) => 'Code execution not implemented',
});
exports.createSearchTool = (e) => ({
  name: 'search',
  description: 'Search the web',
  execute: async (e) => 'Search not implemented',
});
class e {
  constructor(e = {}) {
    ((this.id = e.id || Date.now().toString()),
      (this.status = e.status || 'pending'),
      (this.created_at = e.created_at || new Date().toISOString()),
      (this.updated_at = e.updated_at || new Date().toISOString()),
      (this.metadata = e.metadata || {}));
  }
  static async create(t) {
    return new e(t);
  }
  async start() {
    ((this.status = 'running'), (this.updated_at = new Date().toISOString()));
  }
  async complete(e) {
    return (
      (this.status = 'completed'),
      (this.updated_at = new Date().toISOString()),
      { run: this, output: e }
    );
  }
  async fail(e) {
    return (
      (this.status = 'failed'),
      (this.updated_at = new Date().toISOString()),
      { run: this, error: e }
    );
  }
}
exports.Run = e;
//# sourceMappingURL=index.js.map
