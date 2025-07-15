import { Schema, Document, Types } from 'mongoose';
export interface IKey extends Document {
    userId: Types.ObjectId;
    name: string;
    value: string;
    expiresAt?: Date;
}
declare const keySchema: Schema<IKey>;
export default keySchema;
