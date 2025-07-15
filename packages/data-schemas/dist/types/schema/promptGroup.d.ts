import { Schema, Document, Types } from 'mongoose';
export interface IPromptGroup {
    name: string;
    numberOfGenerations: number;
    oneliner: string;
    category: string;
    projectIds: Types.ObjectId[];
    productionId: Types.ObjectId;
    author: Types.ObjectId;
    authorName: string;
    command?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IPromptGroupDocument extends IPromptGroup, Document {
}
declare const promptGroupSchema: Schema<IPromptGroupDocument, import("mongoose").Model<IPromptGroupDocument, any, any, any, Document<unknown, any, IPromptGroupDocument, any> & IPromptGroupDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IPromptGroupDocument, Document<unknown, {}, import("mongoose").FlatRecord<IPromptGroupDocument>, {}> & import("mongoose").FlatRecord<IPromptGroupDocument> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default promptGroupSchema;
