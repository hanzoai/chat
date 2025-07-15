import { Schema, Document, Types } from 'mongoose';
export interface ISharedLink extends Document {
    conversationId: string;
    title?: string;
    user?: string;
    messages?: Types.ObjectId[];
    shareId?: string;
    isPublic: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const shareSchema: Schema<ISharedLink>;
export default shareSchema;
