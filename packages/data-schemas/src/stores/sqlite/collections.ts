import type { CollectionSpec } from './DocModel';

/**
 * Per-collection storage specs for the SQLite document store.
 *
 * Only the fields that need a unique constraint or query/sort acceleration are
 * declared; every other field lives in the JSON `doc` blob and is still fully
 * queryable via the engine. This is the single place that grows as each domain
 * is migrated off mongoose.
 *
 * REALTIME vs STORAGE (verified 2026-07): the chat client's live updates are
 * SSE token streams (`text/event-stream` via `sendEvent`, and the agent
 * `GenerationJobManager`) tied to the active generation REQUEST — application
 * layer, independent of the persistence backend. A codebase-wide scan found
 * ZERO Mongo change-streams / tailable cursors / `.watch()` / DB-driven
 * subscriptions. Conversation/message reads are plain request/response
 * (getConvosByCursor / getMessages). Therefore NO migrated domain here needs a
 * DB-subscription replacement — plain node:sqlite is correct for all of them.
 *
 * CUTOVER TARGET (per architecture directive "Base for realtime, SQLite for
 * storage"): the live-chat domains — **Conversation** and **Message** — are the
 * ones a multi-device / live-sync UX would subscribe to, so at cutover they
 * target Hanzo Base (which provides native realtime subscriptions over the same
 * SQLite substrate), not a bare table. Every other migrated domain here (Preset,
 * ConversationTag, SharedLink, Project, File, Key, PluginAuth, Banner) is pure
 * storage → SQLite/Base storage tier, no subscription.
 *
 * The DocModel handle abstraction makes this a backend swap, not a code change:
 * the methods call the same Model API whether it resolves to embedded SQLite or a
 * Base-backed handle. No Mongo, no Mongo-wire, no FerretDB anywhere.
 */
export const CHAT_COLLECTION_SPECS: Record<string, CollectionSpec> = {
  Conversation: {
    name: 'Conversation',
    unique: ['conversationId'],
    index: ['user', 'organization', 'agent_id', 'updatedAt', 'createdAt', 'expiredAt'],
    dateFields: ['createdAt', 'updatedAt', 'expiredAt'],
  },
  Message: {
    name: 'Message',
    unique: ['messageId'],
    index: ['conversationId', 'user', 'organization', 'parentMessageId', 'createdAt', 'expiredAt'],
    dateFields: ['createdAt', 'updatedAt', 'expiredAt'],
  },

  // ---- Batch 2: self-contained chat documents (no tenant plugin) ----
  Preset: {
    name: 'Preset',
    unique: ['presetId'],
    index: ['user', 'order'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  ConversationTag: {
    name: 'ConversationTag',
    unique: [['tag', 'user']],
    index: ['user', 'position'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  SharedLink: {
    name: 'SharedLink',
    index: ['shareId', 'conversationId', 'user', 'targetMessageId', 'createdAt'],
    dateFields: ['createdAt', 'updatedAt'],
    refs: { messages: 'Message' },
    defaults: { isPublic: true },
  },

  // ---- Batch 3: Project (mechanical; prompt library group membership) ----
  Project: {
    name: 'Project',
    index: ['name'],
    dateFields: ['createdAt', 'updatedAt'],
    defaults: { promptGroupIds: [], agentIds: [] },
  },

  // ---- Batch 4: non-tenant storage domains ----
  File: {
    name: 'File',
    index: ['file_id', 'user', 'conversationId', 'messageId'],
    dateFields: ['createdAt', 'updatedAt', 'expiresAt'],
  },
  Key: {
    name: 'Key',
    index: ['userId', 'name', 'expiresAt'],
    dateFields: ['expiresAt', 'createdAt', 'updatedAt'],
  },
  PluginAuth: {
    name: 'PluginAuth',
    index: ['userId', 'pluginKey', 'authField'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  Banner: {
    name: 'Banner',
    index: ['bannerId', 'type'],
    dateFields: ['displayFrom', 'displayTo', 'createdAt', 'updatedAt'],
    defaults: { isPublic: false, type: 'banner' },
  },

  // ---- Batch 5/6: tenant-isolated domains ----
  Config: {
    name: 'Config',
    unique: [['principalType', 'principalId', 'tenantId']],
    index: ['principalType', 'principalId', 'isActive', 'priority', 'tenantId'],
    dateFields: ['createdAt', 'updatedAt'],
    tenantIsolated: true,
  },
  SystemGrant: {
    name: 'SystemGrant',
    unique: [['principalType', 'principalId', 'capability', 'tenantId']],
    index: ['capability', 'tenantId', 'principalType', 'principalId'],
    dateFields: ['grantedAt', 'expiresAt', 'createdAt', 'updatedAt'],
    tenantIsolated: true,
  },

  // ---- Batch 7: ObjectId-coupled domains (need handle.Types.ObjectId) ----
  MCPServer: {
    name: 'MCPServer',
    unique: ['serverName'],
    index: ['author', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  Skill: {
    name: 'Skill',
    unique: [['name', 'author', 'tenantId']],
    index: ['author', 'category', 'tenantId', 'alwaysApply', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
    tenantIsolated: true,
  },
  SkillFile: {
    name: 'SkillFile',
    unique: [['skillId', 'relativePath']],
    index: ['skillId', 'category', 'author', 'tenantId', 'file_id'],
    dateFields: ['createdAt', 'updatedAt'],
    tenantIsolated: true,
  },
  Prompt: {
    name: 'Prompt',
    index: ['groupId', 'author', 'type', 'createdAt', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  PromptGroup: {
    name: 'PromptGroup',
    index: ['author', 'category', 'productionId', 'command', 'createdAt', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
    refs: { productionId: 'Prompt', prompts: 'Prompt' },
  },

  // ---- Batch 8: chat-native domains with no external subsystem owner ----
  // (Agent family + memory + app-domain authz; NOT delegated — see collections
  // header note. Cloud /v1/agents is an additive read+execute feature, there is
  // no /v1/memory, and Role/AccessRole/AclEntry/Group have no IAM equivalent.)
  AgentApiKey: {
    name: 'AgentApiKey',
    index: ['userId', 'name', 'keyPrefix', 'expiresAt'],
    dateFields: ['lastUsedAt', 'expiresAt', 'createdAt', 'updatedAt'],
  },
  Assistant: {
    name: 'Assistant',
    index: ['user', 'assistant_id'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  Action: {
    name: 'Action',
    index: ['user', 'action_id', 'agent_id', 'assistant_id'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  ToolCall: {
    name: 'ToolCall',
    index: ['messageId', 'user', 'conversationId', 'toolId'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  MemoryEntry: {
    name: 'MemoryEntry',
    index: ['userId', 'key'],
    dateFields: ['updated_at', 'createdAt', 'updatedAt'],
  },
  Role: {
    name: 'Role',
    unique: ['name'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  AccessRole: {
    name: 'AccessRole',
    unique: ['accessRoleId'],
    index: ['resourceType', 'name'],
    dateFields: ['createdAt', 'updatedAt'],
  },

  // ---- Batch 8b: Agent family + ACL (ObjectId + aggregate $group) ----
  Agent: {
    name: 'Agent',
    unique: ['id'],
    index: ['author', 'category', 'is_promoted', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  AgentCategory: {
    name: 'AgentCategory',
    unique: ['value'],
    index: ['isActive', 'order', 'label'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  AclEntry: {
    name: 'AclEntry',
    index: ['principalId', 'principalType', 'resourceType', 'resourceId', 'permBits'],
    dateFields: ['grantedAt', 'createdAt', 'updatedAt'],
  },
  Group: {
    name: 'Group',
    index: ['source', 'idOnTheSource', 'name', 'memberIds'],
    dateFields: ['createdAt', 'updatedAt'],
  },

  // ---- Batch 9: auth + billing — the collections that ACTUALLY hold live data
  // in chat-docdb outside the domains above (users/sessions/transactions/balances
  // are populated; tokens is on the same auth path). These must move to SQLite
  // for chat-docdb to be deletable without data loss — User is the hot-path record
  // that every authenticated request loads and that every conversation references
  // by `_id`, so its `_id` MUST survive the migration (backfill preserves it).
  // Their data methods read `.models`/`.Types` off the seam handle, so they route
  // here once flagged (see methods/index.ts, api/models/Transaction.js). Uniques
  // on the sparse social/openid ids are safe: an absent id is NULL in json_extract
  // and SQLite treats NULLs as distinct, so it mirrors the mongoose `sparse`.
  User: {
    name: 'User',
    unique: ['email', 'openidId', 'googleId', 'githubId'],
    index: ['organization', 'provider', 'username', 'idOnTheSource', 'role'],
    dateFields: ['createdAt', 'updatedAt', 'expiresAt'],
  },
  Session: {
    name: 'Session',
    index: ['refreshToken', 'user', 'expiration'],
    dateFields: ['expiration', 'createdAt', 'updatedAt'],
  },
  Token: {
    name: 'Token',
    index: ['userId', 'token', 'email', 'type', 'identifier'],
    dateFields: ['createdAt', 'expiresAt'],
  },
  Balance: {
    name: 'Balance',
    index: ['user', 'commerceUserId'],
    dateFields: ['lastRefill', 'expiresAt', 'creditsGrantedAt', 'createdAt', 'updatedAt'],
  },
  Transaction: {
    name: 'Transaction',
    index: ['user', 'conversationId', 'model', 'createdAt'],
    dateFields: ['createdAt', 'updatedAt'],
  },
};
