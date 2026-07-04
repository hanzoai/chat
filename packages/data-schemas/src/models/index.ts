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
import {
  createSqliteHandle,
  createDualWriteModel,
  CHAT_COLLECTION_SPECS,
  type SqliteHandle,
} from '~/stores/sqlite';
import logger from '~/config/winston';

/** CSV env → the subset of names that have a CollectionSpec (fail-closed). */
function parseDomainCsv(csv: string | undefined): Set<string> {
  const out = new Set<string>();
  for (const raw of (csv ?? '').split(',')) {
    const name = raw.trim();
    if (name && name in CHAT_COLLECTION_SPECS) {
      out.add(name);
    }
  }
  return out;
}

/**
 * ONE shared SQLite connection per process for the real (file) DB, so the two
 * `createModels(mongoose)` call sites (`api/db/models.js` and the methods
 * `dbHandle`) write through a single writer — no cross-connection SQLITE_BUSY,
 * and dual-write awaits are sub-millisecond. `:memory:` (tests) always gets a
 * fresh handle for isolation.
 */
let sharedHandle: SqliteHandle | undefined;
let sharedKey = '';
function sqliteHandleFor(names: string[]): SqliteHandle {
  const path = process.env.CHAT_SQLITE_PATH ?? ':memory:';
  if (path === ':memory:') {
    return createSqliteHandle(names);
  }
  const key = `${path}::${[...names].sort().join(',')}`;
  if (!sharedHandle || sharedKey !== key) {
    sharedHandle = createSqliteHandle(names);
    sharedKey = key;
  }
  return sharedHandle;
}

/**
 * Per-domain backend selection — the migration seam. Two ORTHOGONAL flags:
 *
 *   - `CHAT_STORE_SQLITE`    — CSV of domains SERVED from the SQLite store
 *     (the primary; reads come from here). Unset ⇒ mongoose serves everything,
 *     byte-for-byte unchanged, so the live deployment is untouched.
 *   - `CHAT_STORE_DUALWRITE` — CSV of domains whose writes land in BOTH stores.
 *     The primary (per `CHAT_STORE_SQLITE`) is authoritative; the other store is
 *     mirrored by the primary's `_id` via `DualWriteModel`.
 *
 * The four combinations, per domain:
 *   neither          → mongoose only (unchanged).
 *   sqlite only      → SQLite primary, no mirror (hard flip — post-soak).
 *   dualwrite only   → mongoose primary + SQLite mirror (Phase-1 warm-up).
 *   sqlite+dualwrite → SQLite primary + mongoose mirror (post-flip rollback soak).
 *
 * Only domains with a CollectionSpec participate. Config/SystemGrant/Skill/
 * SkillFile have specs but are NOT built into the mongoose registry by
 * `createModels` and their methods are unwired, so they cannot be dual-written
 * (no mongoose model to mirror) — such a request is logged and skipped.
 */
function applyStoreOverrides<T extends Record<string, unknown>>(models: T): T {
  const sqlitePrimary = parseDomainCsv(process.env.CHAT_STORE_SQLITE);
  const dualWrite = parseDomainCsv(process.env.CHAT_STORE_DUALWRITE);
  if (sqlitePrimary.size === 0 && dualWrite.size === 0) {
    return models;
  }

  // Any domain that is SQLite-primary OR dual-written needs a SQLite model.
  const sqliteNeeded = new Set<string>([...sqlitePrimary, ...dualWrite]);
  const handle = sqliteHandleFor([...sqliteNeeded]);
  const out = { ...models } as Record<string, unknown>;

  for (const name of sqliteNeeded) {
    const mongooseModel = out[name];
    const sqliteModel = handle.models[name];
    const isPrimarySqlite = sqlitePrimary.has(name);

    if (!dualWrite.has(name)) {
      out[name] = sqliteModel; // pure flip (SQLite primary, no mirror)
      continue;
    }
    if (mongooseModel === undefined) {
      // Unwired domain (Config/SystemGrant/Skill/SkillFile): no mongoose model
      // to mirror. Fail closed loudly; keep a bare SQLite model only if it was
      // also elected primary, else leave the domain absent (nobody reads it).
      logger.warn(
        `[store] '${name}' has no mongoose model in the registry; cannot dual-write it — skipping mirror`,
      );
      if (isPrimarySqlite) {
        out[name] = sqliteModel;
      }
      continue;
    }
    const primary = isPrimarySqlite ? sqliteModel : mongooseModel;
    const mirror = isPrimarySqlite ? mongooseModel : sqliteModel;
    out[name] = createDualWriteModel(name, primary, mirror);
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
  return applyStoreOverrides(models);
}
