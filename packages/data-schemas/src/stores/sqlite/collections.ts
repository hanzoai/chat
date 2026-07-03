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
};
