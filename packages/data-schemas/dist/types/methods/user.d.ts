import mongoose, { FilterQuery } from 'mongoose';
import type { IUser, BalanceConfig, CreateUserRequest, UserDeleteResult } from '~/types';
/** Default JWT session expiry: 15 minutes in milliseconds */
export declare const DEFAULT_SESSION_EXPIRY: number;
/** Factory function that takes mongoose instance and returns the methods */
export declare function createUserMethods(mongoose: typeof import('mongoose')): {
    findUser: (searchCriteria: FilterQuery<IUser>, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    countUsers: (filter?: FilterQuery<IUser>) => Promise<number>;
    createUser: (data: CreateUserRequest, balanceConfig?: BalanceConfig, disableTTL?: boolean, returnUser?: boolean) => Promise<mongoose.Types.ObjectId | Partial<IUser>>;
    updateUser: (userId: string, updateData: Partial<IUser>) => Promise<IUser | null>;
    searchUsers: ({ searchPattern, limit, fieldsToSelect, }: {
        searchPattern: string;
        limit?: number;
        fieldsToSelect?: string | string[] | null;
    }) => Promise<any[]>;
    getUserById: (userId: string, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    generateToken: (user: IUser, expiresIn?: number) => Promise<string>;
    deleteUserById: (userId: string) => Promise<UserDeleteResult>;
    updateUserPlugins: (userId: string, plugins: string[] | undefined, pluginKey: string, action: "install" | "uninstall") => Promise<IUser | null>;
    toggleUserMemories: (userId: string, memoriesEnabled: boolean) => Promise<IUser | null>;
};
export type UserMethods = ReturnType<typeof createUserMethods>;
