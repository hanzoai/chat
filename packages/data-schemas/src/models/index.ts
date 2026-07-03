import { createUserModel } from './user';
import { createTokenModel } from './token';
import { createSessionModel } from './session';
import { createBalanceModel } from './balance';
import { createConversationModel } from './convo';
import { createMessageModel } from './message';
import { createAgentModel } from './agent';
import { createAgentApiKeyModel } from './agentApiKey';
import { createAgentCategoryModel } from './agentCategory';
import { createMCPServerModel } from './mcpServer';
import { createRoleModel } from './role';
import { createActionModel } from './action';
import { createAssistantModel } from './assistant';
import { createFileModel } from './file';
import { createBannerModel } from './banner';
import { createProjectModel } from './project';
import { createKeyModel } from './key';
import { createPluginAuthModel } from './pluginAuth';
import { createTransactionModel } from './transaction';
import { createPresetModel } from './preset';
import { createPromptModel } from './prompt';
import { createPromptGroupModel } from './promptGroup';
import { createConversationTagModel } from './conversationTag';
import { createSharedLinkModel } from './sharedLink';
import { createToolCallModel } from './toolCall';
import { createMemoryModel } from './memory';
import { createAccessRoleModel } from './accessRole';
import { createAclEntryModel } from './aclEntry';
import { createGroupModel } from './group';
import { createSqliteHandle, CHAT_COLLECTION_SPECS } from '~/stores/sqlite';

/**
 * Per-domain backend selection — the migration seam.
 *
 * `CHAT_STORE_SQLITE` is a CSV of collection names to serve from the SQLite
 * document store instead of mongoose (e.g. `Conversation,Message`). Unset (the
 * default) leaves every collection on mongoose, byte-for-byte unchanged — so the
 * live deployment is untouched until a domain is explicitly flipped. Only
 * collections with a CollectionSpec can be overridden; anything else throws,
 * failing closed rather than silently mis-storing.
 */
function applySqliteOverrides<T extends Record<string, unknown>>(models: T): T {
  const csv = process.env.CHAT_STORE_SQLITE?.trim();
  if (!csv) {
    return models;
  }
  const names = csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in CHAT_COLLECTION_SPECS);
  if (names.length === 0) {
    return models;
  }
  const handle = createSqliteHandle(names);
  const out = { ...models } as Record<string, unknown>;
  for (const name of names) {
    out[name] = handle.models[name];
  }
  return out as T;
}

/**
 * Creates all database models for all collections
 */
export function createModels(mongoose: typeof import('mongoose')) {
  const models = {
    User: createUserModel(mongoose),
    Token: createTokenModel(mongoose),
    Session: createSessionModel(mongoose),
    Balance: createBalanceModel(mongoose),
    Conversation: createConversationModel(mongoose),
    Message: createMessageModel(mongoose),
    Agent: createAgentModel(mongoose),
    AgentApiKey: createAgentApiKeyModel(mongoose),
    AgentCategory: createAgentCategoryModel(mongoose),
    MCPServer: createMCPServerModel(mongoose),
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
    AccessRole: createAccessRoleModel(mongoose),
    AclEntry: createAclEntryModel(mongoose),
    Group: createGroupModel(mongoose),
  };
  return applySqliteOverrides(models);
}
