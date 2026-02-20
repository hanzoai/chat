import { Schema, Document, Types } from 'mongoose';
import type { TAttachment } from 'librechat-data-provider';
export interface IToolCallData extends Document {
    conversationId: string;
    messageId: string;
    toolId: string;
    user: Types.ObjectId;
    result?: unknown;
    attachments?: TAttachment[];
    blockIndex?: number;
    partIndex?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const toolCallSchema: Schema<IToolCallData>;
export default toolCallSchema;
