/**
 * Creates all database models for all collections
 */
export declare function createModels(mongoose: typeof import('mongoose')): {
    User: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Token: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Session: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Balance: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Conversation: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Message: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Agent: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Role: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Action: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Assistant: import("mongoose").Model<any, {}, {}, {}, any, any>;
    File: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Banner: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Project: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Key: import("mongoose").Model<any, {}, {}, {}, any, any>;
    PluginAuth: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Transaction: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Preset: import("mongoose").Model<any, {}, {}, {}, any, any>;
    Prompt: import("mongoose").Model<any, {}, {}, {}, any, any>;
    PromptGroup: import("mongoose").Model<any, {}, {}, {}, any, any>;
    ConversationTag: import("mongoose").Model<any, {}, {}, {}, any, any>;
    SharedLink: import("mongoose").Model<any, {}, {}, {}, any, any>;
    ToolCall: import("mongoose").Model<any, {}, {}, {}, any, any>;
    MemoryEntry: import("mongoose").Model<any, {}, {}, {}, any, any>;
};
