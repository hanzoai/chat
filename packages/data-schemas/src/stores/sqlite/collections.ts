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
 * The Hanzo Base realtime path (native SQLite subscriptions) is reserved for
 * FUTURE features that introduce DB-driven push — multi-device live conversation
 * sync, presence, collaborative shared sessions. None exist today; route those
 * collections through Base's realtime API if/when such a feature lands. No Mongo,
 * no Mongo-wire, no FerretDB anywhere.
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
};
