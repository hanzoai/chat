import { type UserMethods } from './user';
import { type SessionMethods } from './session';
import { type TokenMethods } from './token';
import { type RoleMethods } from './role';
import { type MemoryMethods } from './memory';
import { type ShareMethods } from './share';
import { type PluginAuthMethods } from './pluginAuth';
/**
 * Creates all database methods for all collections
 */
export declare function createMethods(mongoose: typeof import('mongoose')): {
    findOnePluginAuth: ({ userId, authField, }: import("..").FindPluginAuthParams) => Promise<IPluginAuth | null>;
    findPluginAuthsByKeys: ({ userId, pluginKeys, }: import("..").FindPluginAuthsByKeysParams) => Promise<IPluginAuth[]>;
    updatePluginAuth: ({ userId, authField, pluginKey, value, }: import("..").UpdatePluginAuthParams) => Promise<IPluginAuth>;
    deletePluginAuth: ({ userId, authField, pluginKey, all, }: import("..").DeletePluginAuthParams) => Promise<import("mongoose").DeleteResult>;
    deleteAllUserPluginAuths: (userId: string) => Promise<import("mongoose").DeleteResult>;
    getSharedLink: (user: string, conversationId: string) => Promise<import("..").GetShareLinkResult>;
    getSharedLinks: (user: string, pageParam?: Date, pageSize?: number, isPublic?: boolean, sortBy?: string, sortDirection?: string, search?: string) => Promise<import("..").SharedLinksResult>;
    createSharedLink: (user: string, conversationId: string) => Promise<import("..").CreateShareResult>;
    updateSharedLink: (user: string, shareId: string) => Promise<import("..").UpdateShareResult>;
    deleteSharedLink: (user: string, shareId: string) => Promise<import("..").DeleteShareResult | null>;
    getSharedMessages: (shareId: string) => Promise<import("..").SharedMessagesResult | null>;
    deleteAllSharedLinks: (user: string) => Promise<import("..").DeleteAllSharesResult>;
    setMemory: ({ userId, key, value, tokenCount, }: import("..").SetMemoryParams) => Promise<import("..").MemoryResult>;
    createMemory: ({ userId, key, value, tokenCount, }: import("..").SetMemoryParams) => Promise<import("..").MemoryResult>;
    deleteMemory: ({ userId, key }: import("..").DeleteMemoryParams) => Promise<import("..").MemoryResult>;
    getAllUserMemories: (userId: string | import("mongoose").Types.ObjectId) => Promise<import("..").IMemoryEntryLean[]>;
    getFormattedMemories: ({ userId, }: import("..").GetFormattedMemoriesParams) => Promise<import("..").FormattedMemoriesResult>;
    listRoles: () => Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    initializeRoles: () => Promise<void>;
    findToken: (query: import("..").TokenQuery) => Promise<import("..").IToken | null>;
    createToken: (tokenData: import("..").TokenCreateData) => Promise<import("..").IToken>;
    updateToken: (query: import("..").TokenQuery, updateData: import("..").TokenUpdateData) => Promise<import("..").IToken | null>;
    deleteTokens: (query: import("..").TokenQuery) => Promise<import("..").TokenDeleteResult>;
    findSession: (params: import("..").SessionSearchParams, options?: import("..").SessionQueryOptions) => Promise<import("..").ISession | null>;
    SessionError: typeof import("./session").SessionError;
    deleteSession: (params: import("..").DeleteSessionParams) => Promise<{
        deletedCount?: number;
    }>;
    createSession: (userId: string, options?: import("..").CreateSessionOptions) => Promise<import("..").SessionResult>;
    updateExpiration: (session: import("..").ISession | string, newExpiration?: Date) => Promise<import("..").ISession>;
    countActiveSessions: (userId: string) => Promise<number>;
    generateRefreshToken: (session: import("..").ISession) => Promise<string>;
    deleteAllUserSessions: (userId: string | {
        userId: string;
    }, options?: import("..").DeleteAllSessionsOptions) => Promise<{
        deletedCount?: number;
    }>;
    findUser: (searchCriteria: import("mongoose").FilterQuery<import("..").IUser>, fieldsToSelect?: string | string[] | null) => Promise<import("..").IUser | null>;
    countUsers: (filter?: import("mongoose").FilterQuery<import("..").IUser>) => Promise<number>;
    createUser: (data: import("..").UserCreateData, balanceConfig?: import("..").BalanceConfig, disableTTL?: boolean, returnUser?: boolean) => Promise<import("mongoose").Types.ObjectId | Partial<import("..").IUser>>;
    updateUser: (userId: string, updateData: Partial<import("..").IUser>) => Promise<import("..").IUser | null>;
    getUserById: (userId: string, fieldsToSelect?: string | string[] | null) => Promise<import("..").IUser | null>;
    deleteUserById: (userId: string) => Promise<import("..").UserUpdateResult>;
    generateToken: (user: import("..").IUser) => Promise<string>;
    toggleUserMemories: (userId: string, memoriesEnabled: boolean) => Promise<import("..").IUser | null>;
};
export type { MemoryMethods, ShareMethods, TokenMethods, PluginAuthMethods };
export type AllMethods = UserMethods & SessionMethods & TokenMethods & RoleMethods & MemoryMethods & ShareMethods & PluginAuthMethods;
