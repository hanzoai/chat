import { Schema, Document, Types } from 'mongoose';
export interface ITransaction extends Document {
    user: Types.ObjectId;
    conversationId?: string;
    tokenType: 'prompt' | 'completion' | 'credits';
    model?: string;
    context?: string;
    valueKey?: string;
    rate?: number;
    rawAmount?: number;
    tokenValue?: number;
    inputTokens?: number;
    writeTokens?: number;
    readTokens?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const transactionSchema: Schema<ITransaction>;
export default transactionSchema;
