import { Schema, Document, Types } from 'mongoose';
export interface IPrompt extends Document {
    groupId: Types.ObjectId;
    author: Types.ObjectId;
    prompt: string;
    type: 'text' | 'chat';
    createdAt?: Date;
    updatedAt?: Date;
}
declare const promptSchema: Schema<IPrompt>;
export default promptSchema;
