import { createModels } from '~/models';
import { createSessionMethods, DEFAULT_REFRESH_TOKEN_EXPIRY, type SessionMethods } from './session';
import { createTokenMethods, type TokenMethods } from './token';
import { createRoleMethods, type RoleMethods } from './role';
import { createUserMethods, DEFAULT_SESSION_EXPIRY, type UserMethods } from './user';

export { DEFAULT_REFRESH_TOKEN_EXPIRY, DEFAULT_SESSION_EXPIRY };
import { createKeyMethods, type KeyMethods } from './key';
import { createFileMethods, type FileMethods } from './file';
/* Memories */
import { createMemoryMethods, type MemoryMethods } from './memory';
/* Agent Categories */
import { createAgentCategoryMethods, type AgentCategoryMethods } from './agentCategory';
/* Agent API Keys */
import { createAgentApiKeyMethods, type AgentApiKeyMethods } from './agentApiKey';
/* MCP Servers */
import { createMCPServerMethods, type MCPServerMethods } from './mcpServer';
/* Plugin Auth */
import { createPluginAuthMethods, type PluginAuthMethods } from './pluginAuth';
/* Permissions */
import { createAccessRoleMethods, type AccessRoleMethods } from './accessRole';
import { createUserGroupMethods, type UserGroupMethods } from './userGroup';
import { createAclEntryMethods, type AclEntryMethods } from './aclEntry';
import { createShareMethods, type ShareMethods } from './share';

export type AllMethods = UserMethods &
  SessionMethods &
  TokenMethods &
  RoleMethods &
  KeyMethods &
  FileMethods &
  MemoryMethods &
  AgentCategoryMethods &
  AgentApiKeyMethods &
  MCPServerMethods &
  UserGroupMethods &
  AclEntryMethods &
  ShareMethods &
  AccessRoleMethods &
  PluginAuthMethods;

/**
 * Creates all database methods for all collections
 * @param mongoose - Mongoose instance
 */
export function createMethods(mongoose: typeof import('mongoose')): AllMethods {
  // Registry-aware handle so migrated domains resolve to the backend selected by
  // CHAT_STORE_SQLITE. An unset flag => createModels returns
  // pure mongoose => unchanged. EVERY domain — including User/Session/Token — now
  // takes this `DataHandle` and reads `.models`/`.Types` off it, the one seam the
  // 28 migrated domains use; none construct mongoose documents (`new Model()`),
  // so all route through the store uniformly.
  const dbHandle = { models: createModels(mongoose), Types: mongoose.Types };
  return {
    ...createUserMethods(dbHandle),
    ...createSessionMethods(dbHandle),
    ...createTokenMethods(dbHandle),
    ...createRoleMethods(dbHandle),
    ...createKeyMethods(dbHandle),
    ...createFileMethods(dbHandle),
    ...createMemoryMethods(dbHandle),
    ...createAgentCategoryMethods(dbHandle),
    ...createAgentApiKeyMethods(dbHandle),
    ...createMCPServerMethods(dbHandle),
    ...createAccessRoleMethods(dbHandle),
    ...createUserGroupMethods(dbHandle),
    ...createAclEntryMethods(dbHandle),
    ...createShareMethods(dbHandle),
    ...createPluginAuthMethods(dbHandle),
  };
}

export type {
  UserMethods,
  SessionMethods,
  TokenMethods,
  RoleMethods,
  KeyMethods,
  FileMethods,
  MemoryMethods,
  AgentCategoryMethods,
  AgentApiKeyMethods,
  MCPServerMethods,
  UserGroupMethods,
  AclEntryMethods,
  ShareMethods,
  AccessRoleMethods,
  PluginAuthMethods,
};
