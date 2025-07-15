import mongoose, { FilterQuery } from 'mongoose';
import type { IUser, BalanceConfig, UserCreateData, UserUpdateResult } from '~/types';
/** Factory function that takes mongoose instance and returns the methods */
export declare function createUserMethods(mongoose: typeof import('mongoose')): {
    findUser: (searchCriteria: FilterQuery<IUser>, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    countUsers: (filter?: FilterQuery<IUser>) => Promise<number>;
    createUser: (data: UserCreateData, balanceConfig?: BalanceConfig, disableTTL?: boolean, returnUser?: boolean) => Promise<mongoose.Types.ObjectId | Partial<IUser>>;
    updateUser: (userId: string, updateData: Partial<IUser>) => Promise<IUser | null>;
    getUserById: (userId: string, fieldsToSelect?: string | string[] | null) => Promise<IUser | null>;
    deleteUserById: (userId: string) => Promise<UserUpdateResult>;
    generateToken: (user: IUser) => Promise<string>;
    toggleUserMemories: (userId: string, memoriesEnabled: boolean) => Promise<IUser | null>;
};
export type UserMethods = ReturnType<typeof createUserMethods>;
