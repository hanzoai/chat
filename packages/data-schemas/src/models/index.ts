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
  createDualWriteModel,
  CHAT_COLLECTION_SPECS,
  type SqliteHandle,
} from '~/stores/sqlite';

/**
 * Per-domain backend selection — the migration seam. Two orthogonal CSV env
 * flags of collection names (only names with a CollectionSpec are honored;
 * unknown names are ignored, failing closed):
 *
 *   CHAT_STORE_SQLITE     — collections SERVED from the SQLite document store
 *                           (reads + the primary write target).
 *   CHAT_STORE_DUALWRITE  — collections written to BOTH stores, mirrored by the
 *                           primary store's `_id`.
 *
 * The four states this yields drive the whole Mongo→SQLite cutover, and any one
 * is a pure config change (no redeploy of logic):
 *
 *   neither            → mongoose only (untouched default).
 *   dualwrite only     → mongoose primary (served) + SQLite mirror   [pre-flip].
 *   sqlite + dualwrite → SQLite primary (served) + mongoose mirror   [post-flip,
 *                        Mongo kept intact as the instant escape hatch].
 *   sqlite only        → SQLite only, no mirror                      [Mongo gone].
 *
 * Unsetting CHAT_STORE_SQLITE reverts serving to mongoose instantly (the mirror
 * kept it current), so the flip is reversible until Mongo is deleted.
 */
function parseStoreCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in CHAT_COLLECTION_SPECS);
}

/**
 * One SQLite handle (one driver connection) per process, shared across
 * every `createModels` call — the api requires the data-schemas index from three
 * entry points, and a per-call handle would open three connections to the same
 * file and race for the WAL write lock. Keyed by the collection set so a changed
 * flag set (only happens across a restart) rebuilds cleanly.
 */
let sharedHandle: SqliteHandle | undefined;
let sharedHandleKey = '';

function sharedSqliteHandle(names: string[]): SqliteHandle {
  const key = [...names].sort().join(',');
  if (!sharedHandle || sharedHandleKey !== key) {
    sharedHandle = createSqliteHandle(names);
    sharedHandleKey = key;
  }
  return sharedHandle;
}

function applySqliteOverrides<T extends Record<string, unknown>>(models: T): T {
  const sqliteNames = new Set(parseStoreCsv(process.env.CHAT_STORE_SQLITE));
  const dualNames = new Set(parseStoreCsv(process.env.CHAT_STORE_DUALWRITE));
  const union = [...new Set([...sqliteNames, ...dualNames])];
  if (union.length === 0) {
    return models;
  }
  const handle = sharedSqliteHandle(union);
  const out = { ...models } as Record<string, unknown>;
  for (const name of union) {
    const mongooseModel = models[name];
    const sqliteModel = handle.models[name];
    const sqlitePrimary = sqliteNames.has(name);
    if (dualNames.has(name)) {
      const primary = sqlitePrimary ? sqliteModel : mongooseModel;
      const mirror = sqlitePrimary ? mongooseModel : sqliteModel;
      out[name] = createDualWriteModel(primary, mirror);
    } else {
      out[name] = sqliteModel;
    }
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
