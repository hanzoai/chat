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
  // Registry-aware handle so already-migrated domains (Share) resolve to the
  // backend selected by CHAT_STORE_SQLITE. Not-yet-migrated factories keep
  // reading the mongoose registry directly; they move to `dbHandle` as they
  // migrate. Unset flag => createModels returns pure mongoose => unchanged.
  const dbHandle = { models: createModels(mongoose) };
  return {
    ...createUserMethods(mongoose),
    ...createSessionMethods(mongoose),
    ...createTokenMethods(mongoose),
    ...createRoleMethods(mongoose),
    ...createKeyMethods(dbHandle),
    ...createFileMethods(dbHandle),
    ...createMemoryMethods(mongoose),
    ...createAgentCategoryMethods(mongoose),
    ...createAgentApiKeyMethods(mongoose),
    ...createMCPServerMethods(mongoose),
    ...createAccessRoleMethods(mongoose),
    ...createUserGroupMethods(mongoose),
    ...createAclEntryMethods(mongoose),
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
