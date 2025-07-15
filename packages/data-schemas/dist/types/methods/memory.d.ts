import { Types } from 'mongoose';
import type * as t from '~/types';
export declare function createMemoryMethods(mongoose: typeof import('mongoose')): {
    setMemory: ({ userId, key, value, tokenCount, }: t.SetMemoryParams) => Promise<t.MemoryResult>;
    createMemory: ({ userId, key, value, tokenCount, }: t.SetMemoryParams) => Promise<t.MemoryResult>;
    deleteMemory: ({ userId, key }: t.DeleteMemoryParams) => Promise<t.MemoryResult>;
    getAllUserMemories: (userId: string | Types.ObjectId) => Promise<t.IMemoryEntryLean[]>;
    getFormattedMemories: ({ userId, }: t.GetFormattedMemoriesParams) => Promise<t.FormattedMemoriesResult>;
};
export type MemoryMethods = ReturnType<typeof createMemoryMethods>;
