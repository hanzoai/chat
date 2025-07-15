import type { Types, Document } from 'mongoose';
export interface IMemoryEntry extends Document {
    userId: Types.ObjectId;
    key: string;
    value: string;
    tokenCount?: number;
    updated_at?: Date;
}
export interface IMemoryEntryLean {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    key: string;
    value: string;
    tokenCount?: number;
    updated_at?: Date;
    __v?: number;
}
export interface SetMemoryParams {
    userId: string | Types.ObjectId;
    key: string;
    value: string;
    tokenCount?: number;
}
export interface DeleteMemoryParams {
    userId: string | Types.ObjectId;
    key: string;
}
export interface GetFormattedMemoriesParams {
    userId: string | Types.ObjectId;
}
export interface MemoryResult {
    ok: boolean;
}
export interface FormattedMemoriesResult {
    withKeys: string;
    withoutKeys: string;
    totalTokens?: number;
}
