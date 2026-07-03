import type { CollectionSpec } from './DocModel';

/**
 * Per-collection storage specs for the SQLite document store.
 *
 * Only the fields that need a unique constraint or query/sort acceleration are
 * declared; every other field lives in the JSON `doc` blob and is still fully
 * queryable via the engine. This is the single place that grows as each domain
 * is migrated off mongoose.
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
};
