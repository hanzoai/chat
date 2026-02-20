/**
 * Creates all database models for all collections
 */
export declare function createModels(mongoose: typeof import('mongoose')): {
    User: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Token: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Session: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Balance: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Conversation: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Message: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Agent: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    AgentApiKey: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    AgentCategory: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    MCPServer: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Role: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Action: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Assistant: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    File: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Banner: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Project: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Key: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    PluginAuth: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Transaction: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Preset: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Prompt: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    PromptGroup: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    ConversationTag: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    SharedLink: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    ToolCall: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    MemoryEntry: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    AccessRole: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    AclEntry: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
    Group: import("mongoose").Model<any, {}, {}, {}, any, any, any>;
};
