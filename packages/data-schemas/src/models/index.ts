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
import { createSystemGrantModel } from './systemGrant';
import {
  createSqliteHandle,
  sharedDatabase,
  closeSharedDatabase,
  attachMeili,
  CHAT_COLLECTION_SPECS,
  type SqliteHandle,
} from '~/stores/sqlite';

/**
 * Per-domain backend selection. One CSV env flag of collection names (only
 * names with a CollectionSpec are honored; unknown names are ignored, failing
 * closed):
 *
 *   CHAT_STORE_SQLITE — collections served from the SQLite document store.
 *
 * Production sets this to all 29 live collections, so prod is SQLite-only.
 * Unset (the repo default, and what the test suites run against) leaves the
 * mongoose models untouched.
 *
 * The Mongo→SQLite cutover finished and its dual-write scaffolding is gone: the
 * mirror existed to keep Mongo current as a rollback target, and there is no
 * Mongo left to roll back to (`chat-docdb` is deleted, `MONGO_URI` is unset).
 */
function parseStoreCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in CHAT_COLLECTION_SPECS);
}

/**
 * One set of models per process, shared across every `createModels` call — the
 * api requires the data-schemas index from three entry points. Keyed by the
 * collection set so a changed flag set (only happens across a restart) rebuilds
 * cleanly. The connection underneath is `sharedDatabase()`, owned by the store
 * and shared with the Keyv cache; rebuilding models over it opens nothing and
 * so leaks nothing.
 */
let sharedHandle: SqliteHandle | undefined;
let sharedHandleKey = '';

function sharedSqliteHandle(names: string[]): SqliteHandle {
  const key = [...names].sort().join(',');
  if (!sharedHandle || sharedHandleKey !== key) {
    sharedHandle = createSqliteHandle(names, { db: sharedDatabase() });
    sharedHandleKey = key;
  }
  return sharedHandle;
}

/**
 * Closes the process-shared SQLite connection and drops the models built on it.
 * Idempotent. The prod path keeps one connection for the process lifetime; this
 * exists so tests that build it tear it down — every native Database opened
 * MUST be closed.
 */
export function closeSharedSqliteHandle(): void {
  sharedHandle = undefined;
  sharedHandleKey = '';
  closeSharedDatabase();
}

function applySqliteOverrides<T extends Record<string, unknown>>(models: T): T {
  const sqliteNames = [...new Set(parseStoreCsv(process.env.CHAT_STORE_SQLITE))];
  if (sqliteNames.length === 0) {
    return models;
  }
  const handle = sharedSqliteHandle(sqliteNames);
  // Drive MeiliSearch from the store: wire live indexing + store-hydrated search
  // onto the SQLite Conversation/Message models (env-gated + idempotent).
  attachMeili(handle.models);
  const out = { ...models } as Record<string, unknown>;
  for (const name of sqliteNames) {
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
    SystemGrant: createSystemGrantModel(mongoose),
  };
  return applySqliteOverrides(models);
}
