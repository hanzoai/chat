import jwt from 'jsonwebtoken';
import { webcrypto } from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
import { FileSources, Constants, PermissionTypes, Permissions, SystemRoles, roleDefaults } from '@hanzochat/data-provider';
import _ from 'lodash';
import { MeiliSearch } from 'meilisearch';
import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { klona } from 'klona';
import traverse from 'traverse';
import { nanoid } from 'nanoid';

async function signPayload({ payload, secret, expirationTime, }) {
    return jwt.sign(payload, secret, { expiresIn: expirationTime });
}
async function hashToken(str) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('hex');
}

// Define the Auth sub-schema with type-safety.
const AuthSchema = new Schema({
    authorization_type: { type: String },
    custom_auth_header: { type: String },
    type: { type: String, enum: ['service_http', 'oauth', 'none'] },
    authorization_content_type: { type: String },
    authorization_url: { type: String },
    client_url: { type: String },
    scope: { type: String },
    token_exchange_method: { type: String, enum: ['default_post', 'basic_auth_header', null] },
}, { _id: false });
const Action = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    },
    action_id: {
        type: String,
        index: true,
        required: true,
    },
    type: {
        type: String,
        default: 'action_prototype',
    },
    settings: Schema.Types.Mixed,
    agent_id: String,
    assistant_id: String,
    metadata: {
        api_key: String,
        auth: AuthSchema,
        domain: {
            type: String,
            required: true,
        },
        privacy_policy_url: String,
        raw_spec: String,
        oauth_client_id: String,
        oauth_client_secret: String,
    },
});

const agentSchema = new Schema({
    id: {
        type: String,
        index: true,
        unique: true,
        required: true,
    },
    name: {
        type: String,
    },
    description: {
        type: String,
    },
    instructions: {
        type: String,
    },
    avatar: {
        type: Schema.Types.Mixed,
        default: undefined,
    },
    provider: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    model_parameters: {
        type: Object,
    },
    artifacts: {
        type: String,
    },
    access_level: {
        type: Number,
    },
    recursion_limit: {
        type: Number,
    },
    tools: {
        type: [String],
        default: undefined,
    },
    tool_kwargs: {
        type: [{ type: Schema.Types.Mixed }],
    },
    actions: {
        type: [String],
        default: undefined,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    authorName: {
        type: String,
        default: undefined,
    },
    hide_sequential_outputs: {
        type: Boolean,
    },
    end_after_tools: {
        type: Boolean,
    },
    agent_ids: {
        type: [String],
    },
    isCollaborative: {
        type: Boolean,
        default: undefined,
    },
    conversation_starters: {
        type: [String],
        default: [],
    },
    tool_resources: {
        type: Schema.Types.Mixed,
        default: {},
    },
    projectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'Project',
        index: true,
    },
    versions: {
        type: [Schema.Types.Mixed],
        default: [],
    },
}, {
    timestamps: true,
});

const assistantSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assistant_id: {
        type: String,
        index: true,
        required: true,
    },
    avatar: {
        type: Schema.Types.Mixed,
        default: undefined,
    },
    conversation_starters: {
        type: [String],
        default: [],
    },
    access_level: {
        type: Number,
    },
    file_ids: { type: [String], default: undefined },
    actions: { type: [String], default: undefined },
    append_current_datetime: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const balanceSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    },
    // 1000 tokenCredits = 1 mill ($0.001 USD)
    tokenCredits: {
        type: Number,
        default: 0,
    },
    // Automatic refill settings
    autoRefillEnabled: {
        type: Boolean,
        default: false,
    },
    refillIntervalValue: {
        type: Number,
        default: 30,
    },
    refillIntervalUnit: {
        type: String,
        enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
        default: 'days',
    },
    lastRefill: {
        type: Date,
        default: Date.now,
    },
    // amount to add on each refill
    refillAmount: {
        type: Number,
        default: 0,
    },
});

const bannerSchema = new Schema({
    bannerId: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    displayFrom: {
        type: Date,
        required: true,
        default: Date.now,
    },
    displayTo: {
        type: Date,
    },
    type: {
        type: String,
        enum: ['banner', 'popup'],
        default: 'banner',
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const categoriesSchema = new Schema({
    label: {
        type: String,
        required: true,
        unique: true,
    },
    value: {
        type: String,
        required: true,
        unique: true,
    },
});

const conversationTag = new Schema({
    tag: {
        type: String,
        index: true,
    },
    user: {
        type: String,
        index: true,
    },
    description: {
        type: String,
        index: true,
    },
    count: {
        type: Number,
        default: 0,
    },
    position: {
        type: Number,
        default: 0,
        index: true,
    },
}, { timestamps: true });
// Create a compound index on tag and user with unique constraint.
conversationTag.index({ tag: 1, user: 1 }, { unique: true });

// @ts-ignore
const conversationPreset = {
    // endpoint: [azureOpenAI, openAI, anthropic, chatGPTBrowser]
    endpoint: {
        type: String,
        default: null,
        required: true,
    },
    endpointType: {
        type: String,
    },
    // for azureOpenAI, openAI, chatGPTBrowser only
    model: {
        type: String,
        required: false,
    },
    // for bedrock only
    region: {
        type: String,
        required: false,
    },
    // for azureOpenAI, openAI only
    chatGptLabel: {
        type: String,
        required: false,
    },
    // for google only
    examples: { type: [{ type: Schema.Types.Mixed }], default: undefined },
    modelLabel: {
        type: String,
        required: false,
    },
    promptPrefix: {
        type: String,
        required: false,
    },
    temperature: {
        type: Number,
        required: false,
    },
    top_p: {
        type: Number,
        required: false,
    },
    // for google only
    topP: {
        type: Number,
        required: false,
    },
    topK: {
        type: Number,
        required: false,
    },
    maxOutputTokens: {
        type: Number,
        required: false,
    },
    maxTokens: {
        type: Number,
        required: false,
    },
    presence_penalty: {
        type: Number,
        required: false,
    },
    frequency_penalty: {
        type: Number,
        required: false,
    },
    file_ids: { type: [{ type: String }], default: undefined },
    // deprecated
    resendImages: {
        type: Boolean,
    },
    /* Anthropic only */
    promptCache: {
        type: Boolean,
    },
    thinking: {
        type: Boolean,
    },
    thinkingBudget: {
        type: Number,
    },
    system: {
        type: String,
    },
    // files
    resendFiles: {
        type: Boolean,
    },
    imageDetail: {
        type: String,
    },
    /* agents */
    agent_id: {
        type: String,
    },
    /* assistants */
    assistant_id: {
        type: String,
    },
    instructions: {
        type: String,
    },
    stop: { type: [{ type: String }], default: undefined },
    isArchived: {
        type: Boolean,
        default: false,
    },
    /* UI Components */
    iconURL: {
        type: String,
    },
    greeting: {
        type: String,
    },
    spec: {
        type: String,
    },
    tags: {
        type: [String],
        default: [],
    },
    tools: { type: [{ type: String }], default: undefined },
    maxContextTokens: {
        type: Number,
    },
    max_tokens: {
        type: Number,
    },
    /** omni models only */
    reasoning_effort: {
        type: String,
    },
};

const convoSchema = new Schema({
    conversationId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        meiliIndex: true,
    },
    title: {
        type: String,
        default: 'New Chat',
        meiliIndex: true,
    },
    user: {
        type: String,
        index: true,
    },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
    agentOptions: {
        type: Schema.Types.Mixed,
    },
    ...conversationPreset,
    agent_id: {
        type: String,
    },
    tags: {
        type: [String],
        default: [],
        meiliIndex: true,
    },
    files: {
        type: [String],
    },
    expiredAt: {
        type: Date,
    },
}, { timestamps: true });
convoSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
convoSchema.index({ createdAt: 1, updatedAt: 1 });
convoSchema.index({ conversationId: 1, user: 1 }, { unique: true });

const file = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    },
    conversationId: {
        type: String,
        ref: 'Conversation',
        index: true,
    },
    file_id: {
        type: String,
        index: true,
        required: true,
    },
    temp_file_id: {
        type: String,
    },
    bytes: {
        type: Number,
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    filepath: {
        type: String,
        required: true,
    },
    object: {
        type: String,
        required: true,
        default: 'file',
    },
    embedded: {
        type: Boolean,
    },
    type: {
        type: String,
        required: true,
    },
    text: {
        type: String,
    },
    context: {
        type: String,
    },
    usage: {
        type: Number,
        required: true,
        default: 0,
    },
    source: {
        type: String,
        default: FileSources.local,
    },
    model: {
        type: String,
    },
    width: Number,
    height: Number,
    metadata: {
        fileIdentifier: String,
    },
    expiresAt: {
        type: Date,
        expires: 3600, // 1 hour in seconds
    },
}, {
    timestamps: true,
});
file.index({ createdAt: 1, updatedAt: 1 });

const keySchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    value: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
    },
});
keySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const messageSchema = new Schema({
    messageId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        meiliIndex: true,
    },
    conversationId: {
        type: String,
        index: true,
        required: true,
        meiliIndex: true,
    },
    user: {
        type: String,
        index: true,
        required: true,
        default: null,
    },
    model: {
        type: String,
        default: null,
    },
    endpoint: {
        type: String,
    },
    conversationSignature: {
        type: String,
    },
    clientId: {
        type: String,
    },
    invocationId: {
        type: Number,
    },
    parentMessageId: {
        type: String,
    },
    tokenCount: {
        type: Number,
    },
    summaryTokenCount: {
        type: Number,
    },
    sender: {
        type: String,
        meiliIndex: true,
    },
    text: {
        type: String,
        meiliIndex: true,
    },
    summary: {
        type: String,
    },
    isCreatedByUser: {
        type: Boolean,
        required: true,
        default: false,
    },
    unfinished: {
        type: Boolean,
        default: false,
    },
    error: {
        type: Boolean,
        default: false,
    },
    finish_reason: {
        type: String,
    },
    feedback: {
        type: {
            rating: {
                type: String,
                enum: ['thumbsUp', 'thumbsDown'],
                required: true,
            },
            tag: {
                type: mongoose.Schema.Types.Mixed,
                required: false,
            },
            text: {
                type: String,
                required: false,
            },
        },
        default: undefined,
        required: false,
    },
    _meiliIndex: {
        type: Boolean,
        required: false,
        select: false,
        default: false,
    },
    files: { type: [{ type: mongoose.Schema.Types.Mixed }], default: undefined },
    plugin: {
        type: {
            latest: {
                type: String,
                required: false,
            },
            inputs: {
                type: [mongoose.Schema.Types.Mixed],
                required: false,
                default: undefined,
            },
            outputs: {
                type: String,
                required: false,
            },
        },
        default: undefined,
    },
    plugins: { type: [{ type: mongoose.Schema.Types.Mixed }], default: undefined },
    content: {
        type: [{ type: mongoose.Schema.Types.Mixed }],
        default: undefined,
        meiliIndex: true,
    },
    thread_id: {
        type: String,
    },
    /* frontend components */
    iconURL: {
        type: String,
    },
    attachments: { type: [{ type: mongoose.Schema.Types.Mixed }], default: undefined },
    /*
    attachments: {
      type: [
        {
          file_id: String,
          filename: String,
          filepath: String,
          expiresAt: Date,
          width: Number,
          height: Number,
          type: String,
          conversationId: String,
          messageId: {
            type: String,
            required: true,
          },
          toolCallId: String,
        },
      ],
      default: undefined,
    },
    */
    expiredAt: {
        type: Date,
    },
}, { timestamps: true });
messageSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ createdAt: 1 });
messageSchema.index({ messageId: 1, user: 1 }, { unique: true });

const pluginAuthSchema = new Schema({
    authField: {
        type: String,
        required: true,
    },
    value: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    pluginKey: {
        type: String,
    },
}, { timestamps: true });

const presetSchema = new Schema({
    presetId: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: 'New Chat',
        meiliIndex: true,
    },
    user: {
        type: String,
        default: null,
    },
    defaultPreset: {
        type: Boolean,
    },
    order: {
        type: Number,
    },
    ...conversationPreset,
    agentOptions: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
}, { timestamps: true });

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    promptGroupIds: {
        type: [Schema.Types.ObjectId],
        ref: 'PromptGroup',
        default: [],
    },
    agentIds: {
        type: [String],
        ref: 'Agent',
        default: [],
    },
}, {
    timestamps: true,
});

const promptSchema = new Schema({
    groupId: {
        type: Schema.Types.ObjectId,
        ref: 'PromptGroup',
        required: true,
        index: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    prompt: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'chat'],
        required: true,
    },
}, {
    timestamps: true,
});
promptSchema.index({ createdAt: 1, updatedAt: 1 });

const promptGroupSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    numberOfGenerations: {
        type: Number,
        default: 0,
    },
    oneliner: {
        type: String,
        default: '',
    },
    category: {
        type: String,
        default: '',
        index: true,
    },
    projectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'Project',
        index: true,
        default: [],
    },
    productionId: {
        type: Schema.Types.ObjectId,
        ref: 'Prompt',
        required: true,
        index: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    authorName: {
        type: String,
        required: true,
    },
    command: {
        type: String,
        index: true,
        validate: {
            validator: function (v) {
                return v === undefined || v === null || v === '' || /^[a-z0-9-]+$/.test(v);
            },
            message: (props) => { var _a; return `${(_a = props === null || props === void 0 ? void 0 : props.value) !== null && _a !== void 0 ? _a : 'Value'} is not a valid command. Only lowercase alphanumeric characters and hyphens are allowed.`; },
        },
        maxlength: [
            Constants.COMMANDS_MAX_LENGTH,
            `Command cannot be longer than ${Constants.COMMANDS_MAX_LENGTH} characters`,
        ],
    }, // Casting here bypasses the type error for the command field.
}, {
    timestamps: true,
});
promptGroupSchema.index({ createdAt: 1, updatedAt: 1 });

// Create a sub-schema for permissions. Notice we disable _id for this subdocument.
const rolePermissionsSchema = new Schema({
    [PermissionTypes.BOOKMARKS]: {
        [Permissions.USE]: { type: Boolean, default: true },
    },
    [PermissionTypes.PROMPTS]: {
        [Permissions.SHARED_GLOBAL]: { type: Boolean, default: false },
        [Permissions.USE]: { type: Boolean, default: true },
        [Permissions.CREATE]: { type: Boolean, default: true },
    },
    [PermissionTypes.MEMORIES]: {
        [Permissions.USE]: { type: Boolean, default: true },
        [Permissions.CREATE]: { type: Boolean, default: true },
        [Permissions.UPDATE]: { type: Boolean, default: true },
        [Permissions.READ]: { type: Boolean, default: true },
        [Permissions.OPT_OUT]: { type: Boolean, default: true },
    },
    [PermissionTypes.AGENTS]: {
        [Permissions.SHARED_GLOBAL]: { type: Boolean, default: false },
        [Permissions.USE]: { type: Boolean, default: true },
        [Permissions.CREATE]: { type: Boolean, default: true },
    },
    [PermissionTypes.MULTI_CONVO]: {
        [Permissions.USE]: { type: Boolean, default: true },
    },
    [PermissionTypes.TEMPORARY_CHAT]: {
        [Permissions.USE]: { type: Boolean, default: true },
    },
    [PermissionTypes.RUN_CODE]: {
        [Permissions.USE]: { type: Boolean, default: true },
    },
    [PermissionTypes.WEB_SEARCH]: {
        [Permissions.USE]: { type: Boolean, default: true },
    },
}, { _id: false });
const roleSchema = new Schema({
    name: { type: String, required: true, unique: true, index: true },
    permissions: {
        type: rolePermissionsSchema,
        default: () => ({
            [PermissionTypes.BOOKMARKS]: { [Permissions.USE]: true },
            [PermissionTypes.PROMPTS]: {
                [Permissions.SHARED_GLOBAL]: false,
                [Permissions.USE]: true,
                [Permissions.CREATE]: true,
            },
            [PermissionTypes.MEMORIES]: {
                [Permissions.USE]: true,
                [Permissions.CREATE]: true,
                [Permissions.UPDATE]: true,
                [Permissions.READ]: true,
            },
            [PermissionTypes.AGENTS]: {
                [Permissions.SHARED_GLOBAL]: false,
                [Permissions.USE]: true,
                [Permissions.CREATE]: true,
            },
            [PermissionTypes.MULTI_CONVO]: { [Permissions.USE]: true },
            [PermissionTypes.TEMPORARY_CHAT]: { [Permissions.USE]: true },
            [PermissionTypes.RUN_CODE]: { [Permissions.USE]: true },
            [PermissionTypes.WEB_SEARCH]: { [Permissions.USE]: true },
        }),
    },
});

const sessionSchema = new Schema({
    refreshTokenHash: {
        type: String,
        required: true,
    },
    expiration: {
        type: Date,
        required: true,
        expires: 0,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

const shareSchema = new Schema({
    conversationId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        index: true,
    },
    user: {
        type: String,
        index: true,
    },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    shareId: {
        type: String,
        index: true,
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const tokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
    },
    email: {
        type: String,
    },
    type: {
        type: String,
    },
    identifier: {
        type: String,
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
    },
});
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const toolCallSchema = new Schema({
    conversationId: {
        type: String,
        required: true,
    },
    messageId: {
        type: String,
        required: true,
    },
    toolId: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    result: {
        type: mongoose.Schema.Types.Mixed,
    },
    attachments: {
        type: mongoose.Schema.Types.Mixed,
    },
    blockIndex: {
        type: Number,
    },
    partIndex: {
        type: Number,
    },
}, { timestamps: true });
toolCallSchema.index({ messageId: 1, user: 1 });
toolCallSchema.index({ conversationId: 1, user: 1 });

const transactionSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    },
    conversationId: {
        type: String,
        ref: 'Conversation',
        index: true,
    },
    tokenType: {
        type: String,
        enum: ['prompt', 'completion', 'credits'],
        required: true,
    },
    model: {
        type: String,
    },
    context: {
        type: String,
    },
    valueKey: {
        type: String,
    },
    rate: Number,
    rawAmount: Number,
    tokenValue: Number,
    inputTokens: { type: Number },
    writeTokens: { type: Number },
    readTokens: { type: Number },
}, {
    timestamps: true,
});

// Session sub-schema
const SessionSchema = new Schema({
    refreshToken: {
        type: String,
        default: '',
    },
}, { _id: false });
// Backup code sub-schema
const BackupCodeSchema = new Schema({
    codeHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
}, { _id: false });
const userSchema = new Schema({
    name: {
        type: String,
    },
    username: {
        type: String,
        lowercase: true,
        default: '',
    },
    email: {
        type: String,
        required: [true, "can't be blank"],
        lowercase: true,
        unique: true,
        match: [/\S+@\S+\.\S+/, 'is invalid'],
        index: true,
    },
    emailVerified: {
        type: Boolean,
        required: true,
        default: false,
    },
    password: {
        type: String,
        trim: true,
        minlength: 8,
        maxlength: 128,
    },
    avatar: {
        type: String,
        required: false,
    },
    provider: {
        type: String,
        required: true,
        default: 'local',
    },
    role: {
        type: String,
        default: SystemRoles.USER,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true,
    },
    openidId: {
        type: String,
        unique: true,
        sparse: true,
    },
    samlId: {
        type: String,
        unique: true,
        sparse: true,
    },
    ldapId: {
        type: String,
        unique: true,
        sparse: true,
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true,
    },
    discordId: {
        type: String,
        unique: true,
        sparse: true,
    },
    appleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    plugins: {
        type: Array,
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    totpSecret: {
        type: String,
    },
    backupCodes: {
        type: [BackupCodeSchema],
    },
    refreshToken: {
        type: [SessionSchema],
    },
    expiresAt: {
        type: Date,
        expires: 604800, // 7 days in seconds
    },
    termsAccepted: {
        type: Boolean,
        default: false,
    },
    personalization: {
        type: {
            memories: {
                type: Boolean,
                default: true,
            },
        },
        default: {},
    },
}, { timestamps: true });

const MemoryEntrySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    },
    key: {
        type: String,
        required: true,
        validate: {
            validator: (v) => /^[a-z_]+$/.test(v),
            message: 'Key must only contain lowercase letters and underscores',
        },
    },
    value: {
        type: String,
        required: true,
    },
    tokenCount: {
        type: Number,
        default: 0,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Creates or returns the User model using the provided mongoose instance and schema
 */
function createUserModel(mongoose) {
    return mongoose.models.User || mongoose.model('User', userSchema);
}

/**
 * Creates or returns the Token model using the provided mongoose instance and schema
 */
function createTokenModel(mongoose) {
    return mongoose.models.Token || mongoose.model('Token', tokenSchema);
}

/**
 * Creates or returns the Session model using the provided mongoose instance and schema
 */
function createSessionModel(mongoose) {
    return mongoose.models.Session || mongoose.model('Session', sessionSchema);
}

/**
 * Creates or returns the Balance model using the provided mongoose instance and schema
 */
function createBalanceModel(mongoose) {
    return mongoose.models.Balance || mongoose.model('Balance', balanceSchema);
}

const logDir$1 = path.join(__dirname, '..', '..', '..', 'api', 'logs');
const { NODE_ENV: NODE_ENV$1, DEBUG_LOGGING: DEBUG_LOGGING$1 = 'false' } = process.env;
const useDebugLogging$1 = (typeof DEBUG_LOGGING$1 === 'string' && DEBUG_LOGGING$1.toLowerCase() === 'true') ||
    DEBUG_LOGGING$1 === 'true';
const levels$1 = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    activity: 6,
    silly: 7,
};
winston.addColors({
    info: 'green',
    warn: 'italic yellow',
    error: 'red',
    debug: 'blue',
});
const level$1 = () => {
    const env = NODE_ENV$1 || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};
const fileFormat$1 = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.splat());
const logLevel = useDebugLogging$1 ? 'debug' : 'error';
const transports$1 = [
    new winston.transports.DailyRotateFile({
        level: logLevel,
        filename: `${logDir$1}/meiliSync-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat$1,
    }),
];
const consoleFormat$1 = winston.format.combine(winston.format.colorize({ all: true }), winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
transports$1.push(new winston.transports.Console({
    level: 'info',
    format: consoleFormat$1,
}));
const logger$1 = winston.createLogger({
    level: level$1(),
    levels: levels$1,
    transports: transports$1,
});

// Environment flags
/**
 * Flag to indicate if search is enabled based on environment variables.
 */
const searchEnabled = process.env.SEARCH != null && process.env.SEARCH.toLowerCase() === 'true';
/**
 * Flag to indicate if MeiliSearch is enabled based on required environment variables.
 */
const meiliEnabled = process.env.MEILI_HOST != null && process.env.MEILI_MASTER_KEY != null && searchEnabled;
/**
 * Get sync configuration from environment variables
 */
const getSyncConfig = () => ({
    batchSize: parseInt(process.env.MEILI_SYNC_BATCH_SIZE || '100', 10),
    delayMs: parseInt(process.env.MEILI_SYNC_DELAY_MS || '100', 10),
});
/**
 * Local implementation of parseTextParts to avoid dependency on @hanzochat/data-provider
 * Extracts text content from an array of content items
 */
const parseTextParts = (content) => {
    if (!Array.isArray(content)) {
        return '';
    }
    return content
        .filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join(' ')
        .trim();
};
/**
 * Local implementation to handle Bing convoId conversion
 */
const cleanUpPrimaryKeyValue = (value) => {
    return value.replace(/--/g, '|');
};
/**
 * Validates the required options for configuring the mongoMeili plugin.
 */
const validateOptions = (options) => {
    const requiredKeys = ['host', 'apiKey', 'indexName'];
    requiredKeys.forEach((key) => {
        if (!options[key]) {
            throw new Error(`Missing mongoMeili Option: ${key}`);
        }
    });
};
/**
 * Helper function to process documents in batches with rate limiting
 */
const processBatch = async (items, batchSize, delayMs, processor) => {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await processor(batch);
        // Add delay between batches to prevent overwhelming resources
        if (i + batchSize < items.length && delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};
/**
 * Factory function to create a MeiliMongooseModel class which extends a Mongoose model.
 * This class contains static and instance methods to synchronize and manage the MeiliSearch index
 * corresponding to the MongoDB collection.
 *
 * @param config - Configuration object.
 * @param config.index - The MeiliSearch index object.
 * @param config.attributesToIndex - List of attributes to index.
 * @param config.syncOptions - Sync configuration options.
 * @returns A class definition that will be loaded into the Mongoose schema.
 */
const createMeiliMongooseModel = ({ index, attributesToIndex, syncOptions, }) => {
    const primaryKey = attributesToIndex[0];
    const syncConfig = { ...getSyncConfig(), ...syncOptions };
    class MeiliMongooseModel {
        /**
         * Get the current sync progress
         */
        static async getSyncProgress() {
            const totalDocuments = await this.countDocuments();
            const indexedDocuments = await this.countDocuments({ _meiliIndex: true });
            return {
                totalProcessed: indexedDocuments,
                totalDocuments,
                isComplete: indexedDocuments === totalDocuments,
            };
        }
        /**
         * Synchronizes the data between the MongoDB collection and the MeiliSearch index.
         * Now uses streaming and batching to reduce memory usage.
         */
        static async syncWithMeili(options) {
            try {
                const startTime = Date.now();
                const { batchSize, delayMs } = syncConfig;
                logger$1.info(`[syncWithMeili] Starting sync for ${primaryKey === 'messageId' ? 'messages' : 'conversations'} with batch size ${batchSize}`);
                // Build query with resume capability
                const query = {};
                if (options === null || options === void 0 ? void 0 : options.resumeFromId) {
                    query._id = { $gt: options.resumeFromId };
                }
                // Get total count for progress tracking
                const totalCount = await this.countDocuments(query);
                let processedCount = 0;
                // First, handle documents that need to be removed from Meili
                await this.cleanupMeiliIndex(index, primaryKey, batchSize, delayMs);
                // Process MongoDB documents in batches using cursor
                const cursor = this.find(query)
                    .select(attributesToIndex.join(' ') + ' _meiliIndex')
                    .sort({ _id: 1 })
                    .batchSize(batchSize)
                    .cursor();
                const format = (doc) => _.omitBy(_.pick(doc, attributesToIndex), (v, k) => k.startsWith('$'));
                let documentBatch = [];
                let updateOps = [];
                // Process documents in streaming fashion
                for await (const doc of cursor) {
                    const typedDoc = doc.toObject();
                    const formatted = format(typedDoc);
                    // Check if document needs indexing
                    if (!typedDoc._meiliIndex) {
                        documentBatch.push(formatted);
                        updateOps.push({
                            updateOne: {
                                filter: { _id: typedDoc._id },
                                update: { $set: { _meiliIndex: true } },
                            },
                        });
                    }
                    processedCount++;
                    // Process batch when it reaches the configured size
                    if (documentBatch.length >= batchSize) {
                        await this.processSyncBatch(index, documentBatch, updateOps);
                        documentBatch = [];
                        updateOps = [];
                        // Log progress
                        const progress = Math.round((processedCount / totalCount) * 100);
                        logger$1.info(`[syncWithMeili] Progress: ${progress}% (${processedCount}/${totalCount})`);
                        // Add delay to prevent overwhelming resources
                        if (delayMs > 0) {
                            await new Promise((resolve) => setTimeout(resolve, delayMs));
                        }
                    }
                }
                // Process remaining documents
                if (documentBatch.length > 0) {
                    await this.processSyncBatch(index, documentBatch, updateOps);
                }
                const duration = Date.now() - startTime;
                logger$1.info(`[syncWithMeili] Completed sync for ${primaryKey === 'messageId' ? 'messages' : 'conversations'} in ${duration}ms`);
            }
            catch (error) {
                logger$1.error('[syncWithMeili] Error during sync:', error);
                throw error;
            }
        }
        /**
         * Process a batch of documents for syncing
         */
        static async processSyncBatch(index, documents, updateOps) {
            if (documents.length === 0) {
                return;
            }
            try {
                // Add documents to MeiliSearch
                await index.addDocuments(documents);
                // Update MongoDB to mark documents as indexed
                if (updateOps.length > 0) {
                    await this.collection.bulkWrite(updateOps);
                }
            }
            catch (error) {
                logger$1.error('[processSyncBatch] Error processing batch:', error);
                // Don't throw - allow sync to continue with other documents
            }
        }
        /**
         * Clean up documents in MeiliSearch that no longer exist in MongoDB
         */
        static async cleanupMeiliIndex(index, primaryKey, batchSize, delayMs) {
            try {
                let offset = 0;
                let moreDocuments = true;
                while (moreDocuments) {
                    const batch = await index.getDocuments({ limit: batchSize, offset });
                    if (batch.results.length === 0) {
                        moreDocuments = false;
                        break;
                    }
                    const meiliIds = batch.results.map((doc) => doc[primaryKey]);
                    const query = {};
                    query[primaryKey] = { $in: meiliIds };
                    // Find which documents exist in MongoDB
                    const existingDocs = await this.find(query).select(primaryKey).lean();
                    const existingIds = new Set(existingDocs.map((doc) => doc[primaryKey]));
                    // Delete documents that don't exist in MongoDB
                    const toDelete = meiliIds.filter((id) => !existingIds.has(id));
                    if (toDelete.length > 0) {
                        await Promise.all(toDelete.map((id) => index.deleteDocument(id)));
                        logger$1.debug(`[cleanupMeiliIndex] Deleted ${toDelete.length} orphaned documents`);
                    }
                    offset += batchSize;
                    // Add delay between batches
                    if (delayMs > 0) {
                        await new Promise((resolve) => setTimeout(resolve, delayMs));
                    }
                }
            }
            catch (error) {
                logger$1.error('[cleanupMeiliIndex] Error during cleanup:', error);
            }
        }
        /**
         * Updates settings for the MeiliSearch index
         */
        static async setMeiliIndexSettings(settings) {
            return await index.updateSettings(settings);
        }
        /**
         * Searches the MeiliSearch index and optionally populates results
         */
        static async meiliSearch(q, params, populate) {
            const data = await index.search(q, params);
            if (populate) {
                const query = {};
                query[primaryKey] = _.map(data.hits, (hit) => cleanUpPrimaryKeyValue(hit[primaryKey]));
                const projection = Object.keys(this.schema.obj).reduce((results, key) => {
                    if (!key.startsWith('$')) {
                        results[key] = 1;
                    }
                    return results;
                }, { _id: 1, __v: 1 });
                const hitsFromMongoose = await this.find(query, projection).lean();
                const populatedHits = data.hits.map((hit) => {
                    hit[primaryKey];
                    const originalHit = _.find(hitsFromMongoose, (item) => {
                        const typedItem = item;
                        return typedItem[primaryKey] === hit[primaryKey];
                    });
                    return {
                        ...(originalHit && typeof originalHit === 'object' ? originalHit : {}),
                        ...hit,
                    };
                });
                data.hits = populatedHits;
            }
            return data;
        }
        /**
         * Preprocesses the current document for indexing
         */
        preprocessObjectForIndex() {
            const object = _.omitBy(_.pick(this.toJSON(), attributesToIndex), (v, k) => k.startsWith('$'));
            if (object.conversationId &&
                typeof object.conversationId === 'string' &&
                object.conversationId.includes('|')) {
                object.conversationId = object.conversationId.replace(/\|/g, '--');
            }
            if (object.content && Array.isArray(object.content)) {
                object.text = parseTextParts(object.content);
                delete object.content;
            }
            return object;
        }
        /**
         * Adds the current document to the MeiliSearch index with retry logic
         */
        async addObjectToMeili(next) {
            const object = this.preprocessObjectForIndex();
            const maxRetries = 3;
            let retryCount = 0;
            while (retryCount < maxRetries) {
                try {
                    await index.addDocuments([object]);
                    break;
                }
                catch (error) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        logger$1.error('[addObjectToMeili] Error adding document to Meili after retries:', error);
                        return next();
                    }
                    // Exponential backoff
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }
            try {
                await this.collection.updateMany({ _id: this._id }, { $set: { _meiliIndex: true } });
            }
            catch (error) {
                logger$1.error('[addObjectToMeili] Error updating _meiliIndex field:', error);
                return next();
            }
            next();
        }
        /**
         * Updates the current document in the MeiliSearch index
         */
        async updateObjectToMeili(next) {
            try {
                const object = _.omitBy(_.pick(this.toJSON(), attributesToIndex), (v, k) => k.startsWith('$'));
                await index.updateDocuments([object]);
                next();
            }
            catch (error) {
                logger$1.error('[updateObjectToMeili] Error updating document in Meili:', error);
                return next();
            }
        }
        /**
         * Deletes the current document from the MeiliSearch index.
         *
         * @returns {Promise<void>}
         */
        async deleteObjectFromMeili(next) {
            try {
                await index.deleteDocument(this._id);
                next();
            }
            catch (error) {
                logger$1.error('[deleteObjectFromMeili] Error deleting document from Meili:', error);
                return next();
            }
        }
        /**
         * Post-save hook to synchronize the document with MeiliSearch.
         *
         * If the document is already indexed (i.e. `_meiliIndex` is true), it updates it;
         * otherwise, it adds the document to the index.
         */
        postSaveHook(next) {
            if (this._meiliIndex) {
                this.updateObjectToMeili(next);
            }
            else {
                this.addObjectToMeili(next);
            }
        }
        /**
         * Post-update hook to update the document in MeiliSearch.
         *
         * This hook is triggered after a document update, ensuring that changes are
         * propagated to the MeiliSearch index if the document is indexed.
         */
        postUpdateHook(next) {
            if (this._meiliIndex) {
                this.updateObjectToMeili(next);
            }
            else {
                next();
            }
        }
        /**
         * Post-remove hook to delete the document from MeiliSearch.
         *
         * This hook is triggered after a document is removed, ensuring that the document
         * is also removed from the MeiliSearch index if it was previously indexed.
         */
        postRemoveHook(next) {
            if (this._meiliIndex) {
                this.deleteObjectFromMeili(next);
            }
            else {
                next();
            }
        }
    }
    return MeiliMongooseModel;
};
/**
 * Mongoose plugin to synchronize MongoDB collections with a MeiliSearch index.
 *
 * This plugin:
 *   - Validates the provided options.
 *   - Adds a `_meiliIndex` field to the schema to track indexing status.
 *   - Sets up a MeiliSearch client and creates an index if it doesn't already exist.
 *   - Loads class methods for syncing, searching, and managing documents in MeiliSearch.
 *   - Registers Mongoose hooks (post-save, post-update, post-remove, etc.) to maintain index consistency.
 *
 * @param schema - The Mongoose schema to which the plugin is applied.
 * @param options - Configuration options.
 * @param options.host - The MeiliSearch host.
 * @param options.apiKey - The MeiliSearch API key.
 * @param options.indexName - The name of the MeiliSearch index.
 * @param options.primaryKey - The primary key field for indexing.
 * @param options.syncBatchSize - Batch size for sync operations.
 * @param options.syncDelayMs - Delay between batches in milliseconds.
 */
function mongoMeili(schema, options) {
    const mongoose = options.mongoose;
    validateOptions(options);
    // Add _meiliIndex field to the schema to track if a document has been indexed in MeiliSearch.
    schema.add({
        _meiliIndex: {
            type: Boolean,
            required: false,
            select: false,
            default: false,
        },
    });
    const { host, apiKey, indexName, primaryKey } = options;
    const syncOptions = {
        batchSize: options.syncBatchSize || getSyncConfig().batchSize,
        delayMs: options.syncDelayMs || getSyncConfig().delayMs,
    };
    const client = new MeiliSearch({ host, apiKey });
    /** Create index only if it doesn't exist */
    const index = client.index(indexName);
    // Check if index exists and create if needed
    (async () => {
        try {
            await index.getRawInfo();
            logger$1.debug(`[mongoMeili] Index ${indexName} already exists`);
        }
        catch (error) {
            const errorCode = error === null || error === void 0 ? void 0 : error.code;
            if (errorCode === 'index_not_found') {
                try {
                    logger$1.info(`[mongoMeili] Creating new index: ${indexName}`);
                    await client.createIndex(indexName, { primaryKey });
                    logger$1.info(`[mongoMeili] Successfully created index: ${indexName}`);
                }
                catch (createError) {
                    // Index might have been created by another instance
                    logger$1.debug(`[mongoMeili] Index ${indexName} may already exist:`, createError);
                }
            }
            else {
                logger$1.error(`[mongoMeili] Error checking index ${indexName}:`, error);
            }
        }
    })();
    // Collect attributes from the schema that should be indexed
    const attributesToIndex = [
        ...Object.entries(schema.obj).reduce((results, [key, value]) => {
            const schemaValue = value;
            return schemaValue.meiliIndex ? [...results, key] : results;
        }, []),
    ];
    schema.loadClass(createMeiliMongooseModel({ index, attributesToIndex, syncOptions }));
    // Register Mongoose hooks
    schema.post('save', function (doc, next) {
        var _a;
        (_a = doc.postSaveHook) === null || _a === void 0 ? void 0 : _a.call(doc, next);
    });
    schema.post('updateOne', function (doc, next) {
        var _a;
        (_a = doc.postUpdateHook) === null || _a === void 0 ? void 0 : _a.call(doc, next);
    });
    schema.post('deleteOne', function (doc, next) {
        var _a;
        (_a = doc.postRemoveHook) === null || _a === void 0 ? void 0 : _a.call(doc, next);
    });
    // Pre-deleteMany hook: remove corresponding documents from MeiliSearch when multiple documents are deleted.
    schema.pre('deleteMany', async function (next) {
        if (!meiliEnabled) {
            return next();
        }
        try {
            const conditions = this.getQuery();
            const { batchSize, delayMs } = syncOptions;
            if (Object.prototype.hasOwnProperty.call(schema.obj, 'messages')) {
                const convoIndex = client.index('convos');
                const deletedConvos = await mongoose
                    .model('Conversation')
                    .find(conditions)
                    .select('conversationId')
                    .lean();
                // Process deletions in batches
                await processBatch(deletedConvos, batchSize, delayMs, async (batch) => {
                    const promises = batch.map((convo) => convoIndex.deleteDocument(convo.conversationId));
                    await Promise.all(promises);
                });
            }
            if (Object.prototype.hasOwnProperty.call(schema.obj, 'messageId')) {
                const messageIndex = client.index('messages');
                const deletedMessages = await mongoose
                    .model('Message')
                    .find(conditions)
                    .select('messageId')
                    .lean();
                // Process deletions in batches
                await processBatch(deletedMessages, batchSize, delayMs, async (batch) => {
                    const promises = batch.map((message) => messageIndex.deleteDocument(message.messageId));
                    await Promise.all(promises);
                });
            }
            return next();
        }
        catch (error) {
            if (meiliEnabled) {
                logger$1.error('[MeiliMongooseModel.deleteMany] There was an issue deleting conversation indexes upon deletion. Next startup may be slow due to syncing.', error);
            }
            return next();
        }
    });
    // Post-findOneAndUpdate hook
    schema.post('findOneAndUpdate', async function (doc, next) {
        var _a;
        if (!meiliEnabled) {
            return next();
        }
        if (doc.unfinished) {
            return next();
        }
        let meiliDoc;
        if (doc.messages) {
            try {
                meiliDoc = await client.index('convos').getDocument(doc.conversationId);
            }
            catch (error) {
                logger$1.debug('[MeiliMongooseModel.findOneAndUpdate] Convo not found in MeiliSearch and will index ' +
                    doc.conversationId, error);
            }
        }
        if (meiliDoc && meiliDoc.title === doc.title) {
            return next();
        }
        (_a = doc.postSaveHook) === null || _a === void 0 ? void 0 : _a.call(doc, next);
    });
}

/**
 * Creates or returns the Conversation model using the provided mongoose instance and schema
 */
function createConversationModel(mongoose) {
    if (process.env.MEILI_HOST && process.env.MEILI_MASTER_KEY) {
        convoSchema.plugin(mongoMeili, {
            mongoose,
            host: process.env.MEILI_HOST,
            apiKey: process.env.MEILI_MASTER_KEY,
            /** Note: Will get created automatically if it doesn't exist already */
            indexName: 'convos',
            primaryKey: 'conversationId',
        });
    }
    return (mongoose.models.Conversation || mongoose.model('Conversation', convoSchema));
}

/**
 * Creates or returns the Message model using the provided mongoose instance and schema
 */
function createMessageModel(mongoose) {
    if (process.env.MEILI_HOST && process.env.MEILI_MASTER_KEY) {
        messageSchema.plugin(mongoMeili, {
            mongoose,
            host: process.env.MEILI_HOST,
            apiKey: process.env.MEILI_MASTER_KEY,
            indexName: 'messages',
            primaryKey: 'messageId',
        });
    }
    return mongoose.models.Message || mongoose.model('Message', messageSchema);
}

/**
 * Creates or returns the Agent model using the provided mongoose instance and schema
 */
function createAgentModel(mongoose) {
    return mongoose.models.Agent || mongoose.model('Agent', agentSchema);
}

/**
 * Creates or returns the Role model using the provided mongoose instance and schema
 */
function createRoleModel(mongoose) {
    return mongoose.models.Role || mongoose.model('Role', roleSchema);
}

/**
 * Creates or returns the Action model using the provided mongoose instance and schema
 */
function createActionModel(mongoose) {
    return mongoose.models.Action || mongoose.model('Action', Action);
}

/**
 * Creates or returns the Assistant model using the provided mongoose instance and schema
 */
function createAssistantModel(mongoose) {
    return mongoose.models.Assistant || mongoose.model('Assistant', assistantSchema);
}

/**
 * Creates or returns the File model using the provided mongoose instance and schema
 */
function createFileModel(mongoose) {
    return mongoose.models.File || mongoose.model('File', file);
}

/**
 * Creates or returns the Banner model using the provided mongoose instance and schema
 */
function createBannerModel(mongoose) {
    return mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
}

/**
 * Creates or returns the Project model using the provided mongoose instance and schema
 */
function createProjectModel(mongoose) {
    return mongoose.models.Project || mongoose.model('Project', projectSchema);
}

/**
 * Creates or returns the Key model using the provided mongoose instance and schema
 */
function createKeyModel(mongoose) {
    return mongoose.models.Key || mongoose.model('Key', keySchema);
}

/**
 * Creates or returns the PluginAuth model using the provided mongoose instance and schema
 */
function createPluginAuthModel(mongoose) {
    return mongoose.models.PluginAuth || mongoose.model('PluginAuth', pluginAuthSchema);
}

/**
 * Creates or returns the Transaction model using the provided mongoose instance and schema
 */
function createTransactionModel(mongoose) {
    return (mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema));
}

/**
 * Creates or returns the Preset model using the provided mongoose instance and schema
 */
function createPresetModel(mongoose) {
    return mongoose.models.Preset || mongoose.model('Preset', presetSchema);
}

/**
 * Creates or returns the Prompt model using the provided mongoose instance and schema
 */
function createPromptModel(mongoose) {
    return mongoose.models.Prompt || mongoose.model('Prompt', promptSchema);
}

/**
 * Creates or returns the PromptGroup model using the provided mongoose instance and schema
 */
function createPromptGroupModel(mongoose) {
    return (mongoose.models.PromptGroup ||
        mongoose.model('PromptGroup', promptGroupSchema));
}

/**
 * Creates or returns the ConversationTag model using the provided mongoose instance and schema
 */
function createConversationTagModel(mongoose) {
    return (mongoose.models.ConversationTag ||
        mongoose.model('ConversationTag', conversationTag));
}

/**
 * Creates or returns the SharedLink model using the provided mongoose instance and schema
 */
function createSharedLinkModel(mongoose) {
    return mongoose.models.SharedLink || mongoose.model('SharedLink', shareSchema);
}

/**
 * Creates or returns the ToolCall model using the provided mongoose instance and schema
 */
function createToolCallModel(mongoose) {
    return mongoose.models.ToolCall || mongoose.model('ToolCall', toolCallSchema);
}

function createMemoryModel(mongoose) {
    return mongoose.models.MemoryEntry || mongoose.model('MemoryEntry', MemoryEntrySchema);
}

/**
 * Creates all database models for all collections
 */
function createModels(mongoose) {
    return {
        User: createUserModel(mongoose),
        Token: createTokenModel(mongoose),
        Session: createSessionModel(mongoose),
        Balance: createBalanceModel(mongoose),
        Conversation: createConversationModel(mongoose),
        Message: createMessageModel(mongoose),
        Agent: createAgentModel(mongoose),
        Role: createRoleModel(mongoose),
        Action: createActionModel(mongoose),
        Assistant: createAssistantModel(mongoose),
        File: createFileModel(mongoose),
        Banner: createBannerModel(mongoose),
        Project: createProjectModel(mongoose),
        Key: createKeyModel(mongoose),
        PluginAuth: createPluginAuthModel(mongoose),
        Transaction: createTransactionModel(mongoose),
        Preset: createPresetModel(mongoose),
        Prompt: createPromptModel(mongoose),
        PromptGroup: createPromptGroupModel(mongoose),
        ConversationTag: createConversationTagModel(mongoose),
        SharedLink: createSharedLinkModel(mongoose),
        ToolCall: createToolCallModel(mongoose),
        MemoryEntry: createMemoryModel(mongoose),
    };
}

/** Factory function that takes mongoose instance and returns the methods */
function createUserMethods(mongoose) {
    /**
     * Search for a single user based on partial data and return matching user document as plain object.
     */
    async function findUser(searchCriteria, fieldsToSelect) {
        const User = mongoose.models.User;
        const query = User.findOne(searchCriteria);
        if (fieldsToSelect) {
            query.select(fieldsToSelect);
        }
        return (await query.lean());
    }
    /**
     * Count the number of user documents in the collection based on the provided filter.
     */
    async function countUsers(filter = {}) {
        const User = mongoose.models.User;
        return await User.countDocuments(filter);
    }
    /**
     * Creates a new user, optionally with a TTL of 1 week.
     */
    async function createUser(data, balanceConfig, disableTTL = true, returnUser = false) {
        const User = mongoose.models.User;
        const Balance = mongoose.models.Balance;
        const userData = {
            ...data,
            expiresAt: disableTTL ? undefined : new Date(Date.now() + 604800 * 1000), // 1 week in milliseconds
        };
        if (disableTTL) {
            delete userData.expiresAt;
        }
        const user = await User.create(userData);
        // If balance is enabled, create or update a balance record for the user
        if ((balanceConfig === null || balanceConfig === void 0 ? void 0 : balanceConfig.enabled) && (balanceConfig === null || balanceConfig === void 0 ? void 0 : balanceConfig.startBalance)) {
            const update = {
                $inc: { tokenCredits: balanceConfig.startBalance },
            };
            if (balanceConfig.autoRefillEnabled &&
                balanceConfig.refillIntervalValue != null &&
                balanceConfig.refillIntervalUnit != null &&
                balanceConfig.refillAmount != null) {
                update.$set = {
                    autoRefillEnabled: true,
                    refillIntervalValue: balanceConfig.refillIntervalValue,
                    refillIntervalUnit: balanceConfig.refillIntervalUnit,
                    refillAmount: balanceConfig.refillAmount,
                };
            }
            await Balance.findOneAndUpdate({ user: user._id }, update, {
                upsert: true,
                new: true,
            }).lean();
        }
        if (returnUser) {
            return user.toObject();
        }
        return user._id;
    }
    /**
     * Update a user with new data without overwriting existing properties.
     */
    async function updateUser(userId, updateData) {
        const User = mongoose.models.User;
        const updateOperation = {
            $set: updateData,
            $unset: { expiresAt: '' }, // Remove the expiresAt field to prevent TTL
        };
        return (await User.findByIdAndUpdate(userId, updateOperation, {
            new: true,
            runValidators: true,
        }).lean());
    }
    /**
     * Retrieve a user by ID and convert the found user document to a plain object.
     */
    async function getUserById(userId, fieldsToSelect) {
        const User = mongoose.models.User;
        const query = User.findById(userId);
        if (fieldsToSelect) {
            query.select(fieldsToSelect);
        }
        return (await query.lean());
    }
    /**
     * Delete a user by their unique ID.
     */
    async function deleteUserById(userId) {
        try {
            const User = mongoose.models.User;
            const result = await User.deleteOne({ _id: userId });
            if (result.deletedCount === 0) {
                return { deletedCount: 0, message: 'No user found with that ID.' };
            }
            return { deletedCount: result.deletedCount, message: 'User was deleted successfully.' };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error('Error deleting user: ' + errorMessage);
        }
    }
    /**
     * Generates a JWT token for a given user.
     */
    async function generateToken(user) {
        if (!user) {
            throw new Error('No user provided');
        }
        let expires = 1000 * 60 * 15;
        if (process.env.SESSION_EXPIRY !== undefined && process.env.SESSION_EXPIRY !== '') {
            try {
                const evaluated = eval(process.env.SESSION_EXPIRY);
                if (evaluated) {
                    expires = evaluated;
                }
            }
            catch (error) {
                console.warn('Invalid SESSION_EXPIRY expression, using default:', error);
            }
        }
        return await signPayload({
            payload: {
                id: user._id,
                username: user.username,
                provider: user.provider,
                email: user.email,
            },
            secret: process.env.JWT_SECRET,
            expirationTime: expires / 1000,
        });
    }
    /**
     * Update a user's personalization memories setting.
     * Handles the edge case where the personalization object doesn't exist.
     */
    async function toggleUserMemories(userId, memoriesEnabled) {
        const User = mongoose.models.User;
        // First, ensure the personalization object exists
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }
        // Use $set to update the nested field, which will create the personalization object if it doesn't exist
        const updateOperation = {
            $set: {
                'personalization.memories': memoriesEnabled,
            },
        };
        return (await User.findByIdAndUpdate(userId, updateOperation, {
            new: true,
            runValidators: true,
        }).lean());
    }
    // Return all methods
    return {
        findUser,
        countUsers,
        createUser,
        updateUser,
        getUserById,
        deleteUserById,
        generateToken,
        toggleUserMemories,
    };
}

const SPLAT_SYMBOL = Symbol.for('splat');
const MESSAGE_SYMBOL = Symbol.for('message');
const CONSOLE_JSON_STRING_LENGTH = parseInt(process.env.CONSOLE_JSON_STRING_LENGTH || '', 10) || 255;
const sensitiveKeys = [
    /^(sk-)[^\s]+/, // OpenAI API key pattern
    /(Bearer )[^\s]+/, // Header: Bearer token pattern
    /(api-key:? )[^\s]+/, // Header: API key pattern
    /(key=)[^\s]+/, // URL query param: sensitive key pattern (Google)
];
/**
 * Determines if a given value string is sensitive and returns matching regex patterns.
 *
 * @param valueStr - The value string to check.
 * @returns An array of regex patterns that match the value string.
 */
function getMatchingSensitivePatterns(valueStr) {
    if (valueStr) {
        // Filter and return all regex patterns that match the value string
        return sensitiveKeys.filter((regex) => regex.test(valueStr));
    }
    return [];
}
/**
 * Redacts sensitive information from a console message and trims it to a specified length if provided.
 * @param str - The console message to be redacted.
 * @param trimLength - The optional length at which to trim the redacted message.
 * @returns The redacted and optionally trimmed console message.
 */
function redactMessage(str, trimLength) {
    if (!str) {
        return '';
    }
    const patterns = getMatchingSensitivePatterns(str);
    patterns.forEach((pattern) => {
        str = str.replace(pattern, '$1[REDACTED]');
    });
    return str;
}
/**
 * Redacts sensitive information from log messages if the log level is 'error'.
 * Note: Intentionally mutates the object.
 * @param info - The log information object.
 * @returns The modified log information object.
 */
const redactFormat = winston.format((info) => {
    // Guard against undefined info
    if (!info) {
        return info;
    }
    if (info.level === 'error') {
        // Type guard to ensure message is a string
        if (typeof info.message === 'string') {
            info.message = redactMessage(info.message);
        }
        // Handle MESSAGE_SYMBOL with type safety
        const symbolValue = info[MESSAGE_SYMBOL];
        if (typeof symbolValue === 'string') {
            info[MESSAGE_SYMBOL] = redactMessage(symbolValue);
        }
    }
    return info;
});
/**
 * Truncates long strings, especially base64 image data, within log messages.
 *
 * @param value - The value to be inspected and potentially truncated.
 * @param length - The length at which to truncate the value. Default: 100.
 * @returns The truncated or original value.
 */
const truncateLongStrings = (value, length = 100) => {
    if (typeof value === 'string') {
        return value.length > length ? value.substring(0, length) + '... [truncated]' : value;
    }
    return value;
};
/**
 * An array mapping function that truncates long strings (objects converted to JSON strings).
 * @param item - The item to be condensed.
 * @returns The condensed item.
 */
const condenseArray = (item) => {
    if (typeof item === 'string') {
        return truncateLongStrings(JSON.stringify(item));
    }
    else if (typeof item === 'object') {
        return truncateLongStrings(JSON.stringify(item));
    }
    return item;
};
/**
 * Formats log messages for debugging purposes.
 * - Truncates long strings within log messages.
 * - Condenses arrays by truncating long strings and objects as strings within array items.
 * - Redacts sensitive information from log messages if the log level is 'error'.
 * - Converts log information object to a formatted string.
 *
 * @param options - The options for formatting log messages.
 * @returns The formatted log message.
 */
const debugTraverse = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    if (!message) {
        return `${timestamp} ${level}`;
    }
    // Type-safe version of the CJS logic: !message?.trim || typeof message !== 'string'
    if (typeof message !== 'string' || !message.trim) {
        return `${timestamp} ${level}: ${JSON.stringify(message)}`;
    }
    let msg = `${timestamp} ${level}: ${truncateLongStrings(message.trim(), 150)}`;
    try {
        if (level !== 'debug') {
            return msg;
        }
        if (!metadata) {
            return msg;
        }
        // Type-safe access to SPLAT_SYMBOL using bracket notation
        const metadataRecord = metadata;
        const splatArray = metadataRecord[SPLAT_SYMBOL];
        const debugValue = Array.isArray(splatArray) ? splatArray[0] : undefined;
        if (!debugValue) {
            return msg;
        }
        if (debugValue && Array.isArray(debugValue)) {
            msg += `\n${JSON.stringify(debugValue.map(condenseArray))}`;
            return msg;
        }
        if (typeof debugValue !== 'object') {
            return (msg += ` ${debugValue}`);
        }
        msg += '\n{';
        const copy = klona(metadata);
        traverse(copy).forEach(function (value) {
            var _a;
            if (typeof (this === null || this === void 0 ? void 0 : this.key) === 'symbol') {
                return;
            }
            let _parentKey = '';
            const parent = this.parent;
            if (typeof (parent === null || parent === void 0 ? void 0 : parent.key) !== 'symbol' && (parent === null || parent === void 0 ? void 0 : parent.key)) {
                _parentKey = parent.key;
            }
            const parentKey = `${parent && parent.notRoot ? _parentKey + '.' : ''}`;
            const tabs = `${parent && parent.notRoot ? '    ' : '  '}`;
            const currentKey = (_a = this === null || this === void 0 ? void 0 : this.key) !== null && _a !== void 0 ? _a : 'unknown';
            if (this.isLeaf && typeof value === 'string') {
                const truncatedText = truncateLongStrings(value);
                msg += `\n${tabs}${parentKey}${currentKey}: ${JSON.stringify(truncatedText)},`;
            }
            else if (this.notLeaf && Array.isArray(value) && value.length > 0) {
                const currentMessage = `\n${tabs}// ${value.length} ${currentKey.replace(/s$/, '')}(s)`;
                this.update(currentMessage, true);
                msg += currentMessage;
                const stringifiedArray = value.map(condenseArray);
                msg += `\n${tabs}${parentKey}${currentKey}: [${stringifiedArray}],`;
            }
            else if (this.isLeaf && typeof value === 'function') {
                msg += `\n${tabs}${parentKey}${currentKey}: function,`;
            }
            else if (this.isLeaf) {
                msg += `\n${tabs}${parentKey}${currentKey}: ${value},`;
            }
        });
        msg += '\n}';
        return msg;
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return (msg += `\n[LOGGER PARSING ERROR] ${errorMessage}`);
    }
});
/**
 * Truncates long string values in JSON log objects.
 * Prevents outputting extremely long values (e.g., base64, blobs).
 */
const jsonTruncateFormat = winston.format((info) => {
    const truncateLongStrings = (str, maxLength) => str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    const seen = new WeakSet();
    const truncateObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        // Handle circular references - now with proper object type
        if (seen.has(obj)) {
            return '[Circular]';
        }
        seen.add(obj);
        if (Array.isArray(obj)) {
            return obj.map((item) => truncateObject(item));
        }
        // We know this is an object at this point
        const objectRecord = obj;
        const newObj = {};
        Object.entries(objectRecord).forEach(([key, value]) => {
            if (typeof value === 'string') {
                newObj[key] = truncateLongStrings(value, CONSOLE_JSON_STRING_LENGTH);
            }
            else {
                newObj[key] = truncateObject(value);
            }
        });
        return newObj;
    };
    return truncateObject(info);
});

const logDir = path.join(__dirname, '..', '..', '..', 'api', 'logs');
const { NODE_ENV, DEBUG_LOGGING, CONSOLE_JSON, DEBUG_CONSOLE } = process.env;
const useConsoleJson = typeof CONSOLE_JSON === 'string' && CONSOLE_JSON.toLowerCase() === 'true';
const useDebugConsole = typeof DEBUG_CONSOLE === 'string' && DEBUG_CONSOLE.toLowerCase() === 'true';
const useDebugLogging = typeof DEBUG_LOGGING === 'string' && DEBUG_LOGGING.toLowerCase() === 'true';
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    activity: 6,
    silly: 7,
};
winston.addColors({
    info: 'green',
    warn: 'italic yellow',
    error: 'red',
    debug: 'blue',
});
const level = () => {
    const env = NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'warn';
};
const fileFormat = winston.format.combine(redactFormat(), winston.format.timestamp({ format: () => new Date().toISOString() }), winston.format.errors({ stack: true }), winston.format.splat());
const transports = [
    new winston.transports.DailyRotateFile({
        level: 'error',
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
    }),
];
if (useDebugLogging) {
    transports.push(new winston.transports.DailyRotateFile({
        level: 'debug',
        filename: `${logDir}/debug-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(fileFormat, debugTraverse),
    }));
}
const consoleFormat = winston.format.combine(redactFormat(), winston.format.colorize({ all: true }), winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.printf((info) => {
    const message = `${info.timestamp} ${info.level}: ${info.message}`;
    return info.level.includes('error') ? redactMessage(message) : message;
}));
let consoleLogLevel = 'info';
if (useDebugConsole) {
    consoleLogLevel = 'debug';
}
// Add console transport
if (useDebugConsole) {
    transports.push(new winston.transports.Console({
        level: consoleLogLevel,
        format: useConsoleJson
            ? winston.format.combine(fileFormat, jsonTruncateFormat(), winston.format.json())
            : winston.format.combine(fileFormat, debugTraverse),
    }));
}
else if (useConsoleJson) {
    transports.push(new winston.transports.Console({
        level: consoleLogLevel,
        format: winston.format.combine(fileFormat, jsonTruncateFormat(), winston.format.json()),
    }));
}
else {
    transports.push(new winston.transports.Console({
        level: consoleLogLevel,
        format: consoleFormat,
    }));
}
// Create logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
});

var _a;
class SessionError extends Error {
    constructor(message, code = 'SESSION_ERROR') {
        super(message);
        this.name = 'SessionError';
        this.code = code;
    }
}
const { REFRESH_TOKEN_EXPIRY } = (_a = process.env) !== null && _a !== void 0 ? _a : {};
const expires = REFRESH_TOKEN_EXPIRY ? eval(REFRESH_TOKEN_EXPIRY) : 1000 * 60 * 60 * 24 * 7; // 7 days default
// Factory function that takes mongoose instance and returns the methods
function createSessionMethods(mongoose) {
    /**
     * Creates a new session for a user
     */
    async function createSession(userId, options = {}) {
        if (!userId) {
            throw new SessionError('User ID is required', 'INVALID_USER_ID');
        }
        try {
            const Session = mongoose.models.Session;
            const currentSession = new Session({
                user: userId,
                expiration: options.expiration || new Date(Date.now() + expires),
            });
            const refreshToken = await generateRefreshToken(currentSession);
            return { session: currentSession, refreshToken };
        }
        catch (error) {
            logger.error('[createSession] Error creating session:', error);
            throw new SessionError('Failed to create session', 'CREATE_SESSION_FAILED');
        }
    }
    /**
     * Finds a session by various parameters
     */
    async function findSession(params, options = { lean: true }) {
        try {
            const Session = mongoose.models.Session;
            const query = {};
            if (!params.refreshToken && !params.userId && !params.sessionId) {
                throw new SessionError('At least one search parameter is required', 'INVALID_SEARCH_PARAMS');
            }
            if (params.refreshToken) {
                const tokenHash = await hashToken(params.refreshToken);
                query.refreshTokenHash = tokenHash;
            }
            if (params.userId) {
                query.user = params.userId;
            }
            if (params.sessionId) {
                const sessionId = typeof params.sessionId === 'object' &&
                    params.sessionId !== null &&
                    'sessionId' in params.sessionId
                    ? params.sessionId.sessionId
                    : params.sessionId;
                if (!mongoose.Types.ObjectId.isValid(sessionId)) {
                    throw new SessionError('Invalid session ID format', 'INVALID_SESSION_ID');
                }
                query._id = sessionId;
            }
            // Add expiration check to only return valid sessions
            query.expiration = { $gt: new Date() };
            const sessionQuery = Session.findOne(query);
            if (options.lean) {
                return (await sessionQuery.lean());
            }
            return await sessionQuery.exec();
        }
        catch (error) {
            logger.error('[findSession] Error finding session:', error);
            throw new SessionError('Failed to find session', 'FIND_SESSION_FAILED');
        }
    }
    /**
     * Updates session expiration
     */
    async function updateExpiration(session, newExpiration) {
        try {
            const Session = mongoose.models.Session;
            const sessionDoc = typeof session === 'string' ? await Session.findById(session) : session;
            if (!sessionDoc) {
                throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
            }
            sessionDoc.expiration = newExpiration || new Date(Date.now() + expires);
            return await sessionDoc.save();
        }
        catch (error) {
            logger.error('[updateExpiration] Error updating session:', error);
            throw new SessionError('Failed to update session expiration', 'UPDATE_EXPIRATION_FAILED');
        }
    }
    /**
     * Deletes a session by refresh token or session ID
     */
    async function deleteSession(params) {
        try {
            const Session = mongoose.models.Session;
            if (!params.refreshToken && !params.sessionId) {
                throw new SessionError('Either refreshToken or sessionId is required', 'INVALID_DELETE_PARAMS');
            }
            const query = {};
            if (params.refreshToken) {
                query.refreshTokenHash = await hashToken(params.refreshToken);
            }
            if (params.sessionId) {
                query._id = params.sessionId;
            }
            const result = await Session.deleteOne(query);
            if (result.deletedCount === 0) {
                logger.warn('[deleteSession] No session found to delete');
            }
            return result;
        }
        catch (error) {
            logger.error('[deleteSession] Error deleting session:', error);
            throw new SessionError('Failed to delete session', 'DELETE_SESSION_FAILED');
        }
    }
    /**
     * Deletes all sessions for a user
     */
    async function deleteAllUserSessions(userId, options = {}) {
        try {
            const Session = mongoose.models.Session;
            if (!userId) {
                throw new SessionError('User ID is required', 'INVALID_USER_ID');
            }
            const userIdString = typeof userId === 'object' && userId !== null ? userId.userId : userId;
            if (!mongoose.Types.ObjectId.isValid(userIdString)) {
                throw new SessionError('Invalid user ID format', 'INVALID_USER_ID_FORMAT');
            }
            const query = { user: userIdString };
            if (options.excludeCurrentSession && options.currentSessionId) {
                query._id = { $ne: options.currentSessionId };
            }
            const result = await Session.deleteMany(query);
            if (result.deletedCount && result.deletedCount > 0) {
                logger.debug(`[deleteAllUserSessions] Deleted ${result.deletedCount} sessions for user ${userIdString}.`);
            }
            return result;
        }
        catch (error) {
            logger.error('[deleteAllUserSessions] Error deleting user sessions:', error);
            throw new SessionError('Failed to delete user sessions', 'DELETE_ALL_SESSIONS_FAILED');
        }
    }
    /**
     * Generates a refresh token for a session
     */
    async function generateRefreshToken(session) {
        if (!session || !session.user) {
            throw new SessionError('Invalid session object', 'INVALID_SESSION');
        }
        try {
            const expiresIn = session.expiration ? session.expiration.getTime() : Date.now() + expires;
            if (!session.expiration) {
                session.expiration = new Date(expiresIn);
            }
            const refreshToken = await signPayload({
                payload: {
                    id: session.user,
                    sessionId: session._id,
                },
                secret: process.env.JWT_REFRESH_SECRET,
                expirationTime: Math.floor((expiresIn - Date.now()) / 1000),
            });
            session.refreshTokenHash = await hashToken(refreshToken);
            await session.save();
            return refreshToken;
        }
        catch (error) {
            logger.error('[generateRefreshToken] Error generating refresh token:', error);
            throw new SessionError('Failed to generate refresh token', 'GENERATE_TOKEN_FAILED');
        }
    }
    /**
     * Counts active sessions for a user
     */
    async function countActiveSessions(userId) {
        try {
            const Session = mongoose.models.Session;
            if (!userId) {
                throw new SessionError('User ID is required', 'INVALID_USER_ID');
            }
            return await Session.countDocuments({
                user: userId,
                expiration: { $gt: new Date() },
            });
        }
        catch (error) {
            logger.error('[countActiveSessions] Error counting active sessions:', error);
            throw new SessionError('Failed to count active sessions', 'COUNT_SESSIONS_FAILED');
        }
    }
    return {
        findSession,
        SessionError,
        deleteSession,
        createSession,
        updateExpiration,
        countActiveSessions,
        generateRefreshToken,
        deleteAllUserSessions,
    };
}

// Factory function that takes mongoose instance and returns the methods
function createTokenMethods(mongoose) {
    /**
     * Creates a new Token instance.
     */
    async function createToken(tokenData) {
        try {
            const Token = mongoose.models.Token;
            const currentTime = new Date();
            const expiresAt = new Date(currentTime.getTime() + tokenData.expiresIn * 1000);
            const newTokenData = {
                ...tokenData,
                createdAt: currentTime,
                expiresAt,
            };
            return await Token.create(newTokenData);
        }
        catch (error) {
            logger.debug('An error occurred while creating token:', error);
            throw error;
        }
    }
    /**
     * Updates a Token document that matches the provided query.
     */
    async function updateToken(query, updateData) {
        try {
            const Token = mongoose.models.Token;
            return await Token.findOneAndUpdate(query, updateData, { new: true });
        }
        catch (error) {
            logger.debug('An error occurred while updating token:', error);
            throw error;
        }
    }
    /**
     * Deletes all Token documents that match the provided token, user ID, or email.
     */
    async function deleteTokens(query) {
        try {
            const Token = mongoose.models.Token;
            return await Token.deleteMany({
                $or: [
                    { userId: query.userId },
                    { token: query.token },
                    { email: query.email },
                    { identifier: query.identifier },
                ],
            });
        }
        catch (error) {
            logger.debug('An error occurred while deleting tokens:', error);
            throw error;
        }
    }
    /**
     * Finds a Token document that matches the provided query.
     */
    async function findToken(query) {
        try {
            const Token = mongoose.models.Token;
            const conditions = [];
            if (query.userId) {
                conditions.push({ userId: query.userId });
            }
            if (query.token) {
                conditions.push({ token: query.token });
            }
            if (query.email) {
                conditions.push({ email: query.email });
            }
            if (query.identifier) {
                conditions.push({ identifier: query.identifier });
            }
            const token = await Token.findOne({
                $and: conditions,
            }).lean();
            return token;
        }
        catch (error) {
            logger.debug('An error occurred while finding token:', error);
            throw error;
        }
    }
    // Return all methods
    return {
        findToken,
        createToken,
        updateToken,
        deleteTokens,
    };
}

// Factory function that takes mongoose instance and returns the methods
function createRoleMethods(mongoose) {
    /**
     * Initialize default roles in the system.
     * Creates the default roles (ADMIN, USER) if they don't exist in the database.
     * Updates existing roles with new permission types if they're missing.
     */
    async function initializeRoles() {
        const Role = mongoose.models.Role;
        for (const roleName of [SystemRoles.ADMIN, SystemRoles.USER]) {
            let role = await Role.findOne({ name: roleName });
            const defaultPerms = roleDefaults[roleName].permissions;
            if (!role) {
                // Create new role if it doesn't exist.
                role = new Role(roleDefaults[roleName]);
            }
            else {
                // Ensure role.permissions is defined.
                role.permissions = role.permissions || {};
                // For each permission type in defaults, add it if missing.
                for (const permType of Object.keys(defaultPerms)) {
                    if (role.permissions[permType] == null) {
                        role.permissions[permType] = defaultPerms[permType];
                    }
                }
            }
            await role.save();
        }
    }
    /**
     * List all roles in the system (for testing purposes)
     * Returns an array of all roles with their names and permissions
     */
    async function listRoles() {
        const Role = mongoose.models.Role;
        return await Role.find({}).select('name permissions').lean();
    }
    // Return all methods you want to expose
    return {
        listRoles,
        initializeRoles,
    };
}

/**
 * Formats a date in YYYY-MM-DD format
 */
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
// Factory function that takes mongoose instance and returns the methods
function createMemoryMethods(mongoose) {
    const MemoryEntry = mongoose.models.MemoryEntry;
    /**
     * Creates a new memory entry for a user
     * Throws an error if a memory with the same key already exists
     */
    async function createMemory({ userId, key, value, tokenCount = 0, }) {
        try {
            if ((key === null || key === void 0 ? void 0 : key.toLowerCase()) === 'nothing') {
                return { ok: false };
            }
            const existingMemory = await MemoryEntry.findOne({ userId, key });
            if (existingMemory) {
                throw new Error('Memory with this key already exists');
            }
            await MemoryEntry.create({
                userId,
                key,
                value,
                tokenCount,
                updated_at: new Date(),
            });
            return { ok: true };
        }
        catch (error) {
            throw new Error(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Sets or updates a memory entry for a user
     */
    async function setMemory({ userId, key, value, tokenCount = 0, }) {
        try {
            if ((key === null || key === void 0 ? void 0 : key.toLowerCase()) === 'nothing') {
                return { ok: false };
            }
            await MemoryEntry.findOneAndUpdate({ userId, key }, {
                value,
                tokenCount,
                updated_at: new Date(),
            }, {
                upsert: true,
                new: true,
            });
            return { ok: true };
        }
        catch (error) {
            throw new Error(`Failed to set memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Deletes a specific memory entry for a user
     */
    async function deleteMemory({ userId, key }) {
        try {
            const result = await MemoryEntry.findOneAndDelete({ userId, key });
            return { ok: !!result };
        }
        catch (error) {
            throw new Error(`Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Gets all memory entries for a user
     */
    async function getAllUserMemories(userId) {
        try {
            return (await MemoryEntry.find({ userId }).lean());
        }
        catch (error) {
            throw new Error(`Failed to get all memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Gets and formats all memories for a user in two different formats
     */
    async function getFormattedMemories({ userId, }) {
        try {
            const memories = await getAllUserMemories(userId);
            if (!memories || memories.length === 0) {
                return { withKeys: '', withoutKeys: '', totalTokens: 0 };
            }
            const sortedMemories = memories.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
            const totalTokens = sortedMemories.reduce((sum, memory) => {
                return sum + (memory.tokenCount || 0);
            }, 0);
            const withKeys = sortedMemories
                .map((memory, index) => {
                const date = formatDate(new Date(memory.updated_at));
                const tokenInfo = memory.tokenCount ? ` [${memory.tokenCount} tokens]` : '';
                return `${index + 1}. [${date}]. ["key": "${memory.key}"]${tokenInfo}. ["value": "${memory.value}"]`;
            })
                .join('\n\n');
            const withoutKeys = sortedMemories
                .map((memory, index) => {
                const date = formatDate(new Date(memory.updated_at));
                return `${index + 1}. [${date}]. ${memory.value}`;
            })
                .join('\n\n');
            return { withKeys, withoutKeys, totalTokens };
        }
        catch (error) {
            logger.error('Failed to get formatted memories:', error);
            return { withKeys: '', withoutKeys: '', totalTokens: 0 };
        }
    }
    return {
        setMemory,
        createMemory,
        deleteMemory,
        getAllUserMemories,
        getFormattedMemories,
    };
}

class ShareServiceError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ShareServiceError';
        this.code = code;
    }
}
function memoizedAnonymizeId(prefix) {
    const memo = new Map();
    return (id) => {
        if (!memo.has(id)) {
            memo.set(id, `${prefix}_${nanoid()}`);
        }
        return memo.get(id);
    };
}
const anonymizeConvoId = memoizedAnonymizeId('convo');
const anonymizeAssistantId = memoizedAnonymizeId('a');
const anonymizeMessageId = (id) => id === Constants.NO_PARENT ? id : memoizedAnonymizeId('msg')(id);
function anonymizeConvo(conversation) {
    if (!conversation) {
        return null;
    }
    const newConvo = { ...conversation };
    if (newConvo.assistant_id) {
        newConvo.assistant_id = anonymizeAssistantId(newConvo.assistant_id);
    }
    return newConvo;
}
function anonymizeMessages(messages, newConvoId) {
    if (!Array.isArray(messages)) {
        return [];
    }
    const idMap = new Map();
    return messages.map((message) => {
        var _a, _b;
        const newMessageId = anonymizeMessageId(message.messageId);
        idMap.set(message.messageId, newMessageId);
        const anonymizedAttachments = (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.map((attachment) => {
            return {
                ...attachment,
                messageId: newMessageId,
                conversationId: newConvoId,
            };
        });
        return {
            ...message,
            messageId: newMessageId,
            parentMessageId: idMap.get(message.parentMessageId || '') ||
                anonymizeMessageId(message.parentMessageId || ''),
            conversationId: newConvoId,
            model: ((_b = message.model) === null || _b === void 0 ? void 0 : _b.startsWith('asst_'))
                ? anonymizeAssistantId(message.model)
                : message.model,
            attachments: anonymizedAttachments,
        };
    });
}
/** Factory function that takes mongoose instance and returns the methods */
function createShareMethods(mongoose) {
    /**
     * Get shared messages for a public share link
     */
    async function getSharedMessages(shareId) {
        try {
            const SharedLink = mongoose.models.SharedLink;
            const share = (await SharedLink.findOne({ shareId, isPublic: true })
                .populate({
                path: 'messages',
                select: '-_id -__v -user',
            })
                .select('-_id -__v -user')
                .lean());
            if (!(share === null || share === void 0 ? void 0 : share.conversationId) || !share.isPublic) {
                return null;
            }
            const newConvoId = anonymizeConvoId(share.conversationId);
            const result = {
                shareId: share.shareId || shareId,
                title: share.title,
                isPublic: share.isPublic,
                createdAt: share.createdAt,
                updatedAt: share.updatedAt,
                conversationId: newConvoId,
                messages: anonymizeMessages(share.messages, newConvoId),
            };
            return result;
        }
        catch (error) {
            logger.error('[getSharedMessages] Error getting share link', {
                error: error instanceof Error ? error.message : 'Unknown error',
                shareId,
            });
            throw new ShareServiceError('Error getting share link', 'SHARE_FETCH_ERROR');
        }
    }
    /**
     * Get shared links for a specific user with pagination and search
     */
    async function getSharedLinks(user, pageParam, pageSize = 10, isPublic = true, sortBy = 'createdAt', sortDirection = 'desc', search) {
        var _a;
        try {
            const SharedLink = mongoose.models.SharedLink;
            const Conversation = mongoose.models.Conversation;
            const query = { user, isPublic };
            if (pageParam) {
                if (sortDirection === 'desc') {
                    query[sortBy] = { $lt: pageParam };
                }
                else {
                    query[sortBy] = { $gt: pageParam };
                }
            }
            if (search && search.trim()) {
                try {
                    const searchResults = await Conversation.meiliSearch(search);
                    if (!((_a = searchResults === null || searchResults === void 0 ? void 0 : searchResults.hits) === null || _a === void 0 ? void 0 : _a.length)) {
                        return {
                            links: [],
                            nextCursor: undefined,
                            hasNextPage: false,
                        };
                    }
                    const conversationIds = searchResults.hits.map((hit) => hit.conversationId);
                    query['conversationId'] = { $in: conversationIds };
                }
                catch (searchError) {
                    logger.error('[getSharedLinks] Meilisearch error', {
                        error: searchError instanceof Error ? searchError.message : 'Unknown error',
                        user,
                    });
                    return {
                        links: [],
                        nextCursor: undefined,
                        hasNextPage: false,
                    };
                }
            }
            const sort = {};
            sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
            const sharedLinks = await SharedLink.find(query)
                .sort(sort)
                .limit(pageSize + 1)
                .select('-__v -user')
                .lean();
            const hasNextPage = sharedLinks.length > pageSize;
            const links = sharedLinks.slice(0, pageSize);
            const nextCursor = hasNextPage
                ? links[links.length - 1][sortBy]
                : undefined;
            return {
                links: links.map((link) => ({
                    shareId: link.shareId || '',
                    title: (link === null || link === void 0 ? void 0 : link.title) || 'Untitled',
                    isPublic: link.isPublic,
                    createdAt: link.createdAt || new Date(),
                    conversationId: link.conversationId,
                })),
                nextCursor,
                hasNextPage,
            };
        }
        catch (error) {
            logger.error('[getSharedLinks] Error getting shares', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
            });
            throw new ShareServiceError('Error getting shares', 'SHARES_FETCH_ERROR');
        }
    }
    /**
     * Delete all shared links for a user
     */
    async function deleteAllSharedLinks(user) {
        try {
            const SharedLink = mongoose.models.SharedLink;
            const result = await SharedLink.deleteMany({ user });
            return {
                message: 'All shared links deleted successfully',
                deletedCount: result.deletedCount,
            };
        }
        catch (error) {
            logger.error('[deleteAllSharedLinks] Error deleting shared links', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
            });
            throw new ShareServiceError('Error deleting shared links', 'BULK_DELETE_ERROR');
        }
    }
    /**
     * Create a new shared link for a conversation
     */
    async function createSharedLink(user, conversationId) {
        if (!user || !conversationId) {
            throw new ShareServiceError('Missing required parameters', 'INVALID_PARAMS');
        }
        try {
            const Message = mongoose.models.Message;
            const SharedLink = mongoose.models.SharedLink;
            const Conversation = mongoose.models.Conversation;
            const [existingShare, conversationMessages] = await Promise.all([
                SharedLink.findOne({ conversationId, user, isPublic: true })
                    .select('-_id -__v -user')
                    .lean(),
                Message.find({ conversationId, user }).sort({ createdAt: 1 }).lean(),
            ]);
            if (existingShare && existingShare.isPublic) {
                logger.error('[createSharedLink] Share already exists', {
                    user,
                    conversationId,
                });
                throw new ShareServiceError('Share already exists', 'SHARE_EXISTS');
            }
            else if (existingShare) {
                await SharedLink.deleteOne({ conversationId, user });
            }
            const conversation = (await Conversation.findOne({ conversationId, user }).lean());
            // Check if user owns the conversation
            if (!conversation) {
                throw new ShareServiceError('Conversation not found or access denied', 'CONVERSATION_NOT_FOUND');
            }
            // Check if there are any messages to share
            if (!conversationMessages || conversationMessages.length === 0) {
                throw new ShareServiceError('No messages to share', 'NO_MESSAGES');
            }
            const title = conversation.title || 'Untitled';
            const shareId = nanoid();
            await SharedLink.create({
                shareId,
                conversationId,
                messages: conversationMessages,
                title,
                user,
            });
            return { shareId, conversationId };
        }
        catch (error) {
            if (error instanceof ShareServiceError) {
                throw error;
            }
            logger.error('[createSharedLink] Error creating shared link', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
                conversationId,
            });
            throw new ShareServiceError('Error creating shared link', 'SHARE_CREATE_ERROR');
        }
    }
    /**
     * Get a shared link for a conversation
     */
    async function getSharedLink(user, conversationId) {
        if (!user || !conversationId) {
            throw new ShareServiceError('Missing required parameters', 'INVALID_PARAMS');
        }
        try {
            const SharedLink = mongoose.models.SharedLink;
            const share = (await SharedLink.findOne({ conversationId, user, isPublic: true })
                .select('shareId -_id')
                .lean());
            if (!share) {
                return { shareId: null, success: false };
            }
            return { shareId: share.shareId || null, success: true };
        }
        catch (error) {
            logger.error('[getSharedLink] Error getting shared link', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
                conversationId,
            });
            throw new ShareServiceError('Error getting shared link', 'SHARE_FETCH_ERROR');
        }
    }
    /**
     * Update a shared link with new messages
     */
    async function updateSharedLink(user, shareId) {
        if (!user || !shareId) {
            throw new ShareServiceError('Missing required parameters', 'INVALID_PARAMS');
        }
        try {
            const SharedLink = mongoose.models.SharedLink;
            const Message = mongoose.models.Message;
            const share = (await SharedLink.findOne({ shareId, user })
                .select('-_id -__v -user')
                .lean());
            if (!share) {
                throw new ShareServiceError('Share not found', 'SHARE_NOT_FOUND');
            }
            const updatedMessages = await Message.find({ conversationId: share.conversationId, user })
                .sort({ createdAt: 1 })
                .lean();
            const newShareId = nanoid();
            const update = {
                messages: updatedMessages,
                user,
                shareId: newShareId,
            };
            const updatedShare = (await SharedLink.findOneAndUpdate({ shareId, user }, update, {
                new: true,
                upsert: false,
                runValidators: true,
            }).lean());
            if (!updatedShare) {
                throw new ShareServiceError('Share update failed', 'SHARE_UPDATE_ERROR');
            }
            anonymizeConvo(updatedShare);
            return { shareId: newShareId, conversationId: updatedShare.conversationId };
        }
        catch (error) {
            logger.error('[updateSharedLink] Error updating shared link', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
                shareId,
            });
            throw new ShareServiceError(error instanceof ShareServiceError ? error.message : 'Error updating shared link', error instanceof ShareServiceError ? error.code : 'SHARE_UPDATE_ERROR');
        }
    }
    /**
     * Delete a shared link
     */
    async function deleteSharedLink(user, shareId) {
        if (!user || !shareId) {
            throw new ShareServiceError('Missing required parameters', 'INVALID_PARAMS');
        }
        try {
            const SharedLink = mongoose.models.SharedLink;
            const result = await SharedLink.findOneAndDelete({ shareId, user }).lean();
            if (!result) {
                return null;
            }
            return {
                success: true,
                shareId,
                message: 'Share deleted successfully',
            };
        }
        catch (error) {
            logger.error('[deleteSharedLink] Error deleting shared link', {
                error: error instanceof Error ? error.message : 'Unknown error',
                user,
                shareId,
            });
            throw new ShareServiceError('Error deleting shared link', 'SHARE_DELETE_ERROR');
        }
    }
    // Return all methods
    return {
        getSharedLink,
        getSharedLinks,
        createSharedLink,
        updateSharedLink,
        deleteSharedLink,
        getSharedMessages,
        deleteAllSharedLinks,
    };
}

// Factory function that takes mongoose instance and returns the methods
function createPluginAuthMethods(mongoose) {
    const PluginAuth = mongoose.models.PluginAuth;
    /**
     * Finds a single plugin auth entry by userId and authField
     */
    async function findOnePluginAuth({ userId, authField, }) {
        try {
            return await PluginAuth.findOne({ userId, authField }).lean();
        }
        catch (error) {
            throw new Error(`Failed to find plugin auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Finds multiple plugin auth entries by userId and pluginKeys
     */
    async function findPluginAuthsByKeys({ userId, pluginKeys, }) {
        try {
            if (!pluginKeys || pluginKeys.length === 0) {
                return [];
            }
            return await PluginAuth.find({
                userId,
                pluginKey: { $in: pluginKeys },
            }).lean();
        }
        catch (error) {
            throw new Error(`Failed to find plugin auths: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Updates or creates a plugin auth entry
     */
    async function updatePluginAuth({ userId, authField, pluginKey, value, }) {
        try {
            const existingAuth = await PluginAuth.findOne({ userId, pluginKey, authField }).lean();
            if (existingAuth) {
                return await PluginAuth.findOneAndUpdate({ userId, pluginKey, authField }, { $set: { value } }, { new: true, upsert: true }).lean();
            }
            else {
                const newPluginAuth = await new PluginAuth({
                    userId,
                    authField,
                    value,
                    pluginKey,
                });
                await newPluginAuth.save();
                return newPluginAuth.toObject();
            }
        }
        catch (error) {
            throw new Error(`Failed to update plugin auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Deletes plugin auth entries based on provided parameters
     */
    async function deletePluginAuth({ userId, authField, pluginKey, all = false, }) {
        try {
            if (all) {
                const filter = { userId };
                if (pluginKey) {
                    filter.pluginKey = pluginKey;
                }
                return await PluginAuth.deleteMany(filter);
            }
            if (!authField) {
                throw new Error('authField is required when all is false');
            }
            return await PluginAuth.deleteOne({ userId, authField });
        }
        catch (error) {
            throw new Error(`Failed to delete plugin auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Deletes all plugin auth entries for a user
     */
    async function deleteAllUserPluginAuths(userId) {
        try {
            return await PluginAuth.deleteMany({ userId });
        }
        catch (error) {
            throw new Error(`Failed to delete all user plugin auths: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    return {
        findOnePluginAuth,
        findPluginAuthsByKeys,
        updatePluginAuth,
        deletePluginAuth,
        deleteAllUserPluginAuths,
    };
}

/**
 * Creates all database methods for all collections
 */
function createMethods(mongoose) {
    return {
        ...createUserMethods(mongoose),
        ...createSessionMethods(mongoose),
        ...createTokenMethods(mongoose),
        ...createRoleMethods(mongoose),
        ...createMemoryMethods(mongoose),
        ...createShareMethods(mongoose),
        ...createPluginAuthMethods(mongoose),
    };
}

export { Action as actionSchema, agentSchema, assistantSchema, balanceSchema, bannerSchema, categoriesSchema, conversationTag as conversationTagSchema, convoSchema, createMethods, createModels, file as fileSchema, hashToken, keySchema, logger, logger$1 as meiliLogger, MemoryEntrySchema as memorySchema, messageSchema, pluginAuthSchema, presetSchema, projectSchema, promptGroupSchema, promptSchema, roleSchema, sessionSchema, shareSchema, signPayload, tokenSchema, toolCallSchema, transactionSchema, userSchema };
//# sourceMappingURL=index.es.js.map
