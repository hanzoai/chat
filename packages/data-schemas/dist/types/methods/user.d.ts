import type { FilterQuery, Types } from 'mongoose';
import type { DataHandle } from '~/common/dataHandle';
import type { IUser, BalanceConfig, CreateUserRequest, UserDeleteResult } from '~/types';
/** Default JWT session expiry: 15 minutes in milliseconds */
export declare const DEFAULT_SESSION_EXPIRY: number;
/**
 * Factory that returns the user methods bound to a store-aware `DataHandle`
 * (same seam as the migrated domains). `handle.models.User` / `.Balance` resolve
 * to the backend selected by `createModels()` + `applySqliteOverrides()`; every
 * method speaks only the bounded Model API, never `new User()` / `doc.save()`.
 */
export declare function createUserMethods(handle: DataHandle): {
    findUser: (searchCriteria: FilterQuery<IUser>, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    countUsers: (filter?: FilterQuery<IUser>) => Promise<number>;
    createUser: (data: CreateUserRequest, balanceConfig?: BalanceConfig, disableTTL?: boolean, returnUser?: boolean) => Promise<Types.ObjectId | Partial<IUser>>;
    updateUser: (userId: string, updateData: Partial<IUser>) => Promise<IUser | null>;
    searchUsers: ({ searchPattern, limit, fieldsToSelect, }: {
        searchPattern: string;
        limit?: number;
        fieldsToSelect?: string | string[] | null;
    }) => Promise<IUser[]>;
    getUserById: (userId: string, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    generateToken: (user: IUser, expiresIn?: number) => Promise<string>;
    deleteUserById: (userId: string) => Promise<UserDeleteResult>;
    updateUserPlugins: (userId: string, plugins: string[] | undefined, pluginKey: string, action: "install" | "uninstall") => Promise<IUser | null>;
    toggleUserMemories: (userId: string, memoriesEnabled: boolean) => Promise<IUser | null>;
};
export type UserMethods = ReturnType<typeof createUserMethods>;
