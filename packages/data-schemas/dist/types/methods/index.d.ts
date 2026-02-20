import { DEFAULT_REFRESH_TOKEN_EXPIRY, type SessionMethods } from './session';
import { type TokenMethods } from './token';
import { type RoleMethods } from './role';
import { DEFAULT_SESSION_EXPIRY, type UserMethods } from './user';
export { DEFAULT_REFRESH_TOKEN_EXPIRY, DEFAULT_SESSION_EXPIRY };
import { type KeyMethods } from './key';
import { type FileMethods } from './file';
import { type MemoryMethods } from './memory';
import { type AgentCategoryMethods } from './agentCategory';
import { type AgentApiKeyMethods } from './agentApiKey';
import { type MCPServerMethods } from './mcpServer';
import { type PluginAuthMethods } from './pluginAuth';
import { type AccessRoleMethods } from './accessRole';
import { type UserGroupMethods } from './userGroup';
import { type AclEntryMethods } from './aclEntry';
import { type ShareMethods } from './share';
export type AllMethods = UserMethods & SessionMethods & TokenMethods & RoleMethods & KeyMethods & FileMethods & MemoryMethods & AgentCategoryMethods & AgentApiKeyMethods & MCPServerMethods & UserGroupMethods & AclEntryMethods & ShareMethods & AccessRoleMethods & PluginAuthMethods;
/**
 * Creates all database methods for all collections
 * @param mongoose - Mongoose instance
 */
export declare function createMethods(mongoose: typeof import('mongoose')): AllMethods;
export type { UserMethods, SessionMethods, TokenMethods, RoleMethods, KeyMethods, FileMethods, MemoryMethods, AgentCategoryMethods, AgentApiKeyMethods, MCPServerMethods, UserGroupMethods, AclEntryMethods, ShareMethods, AccessRoleMethods, PluginAuthMethods, };
