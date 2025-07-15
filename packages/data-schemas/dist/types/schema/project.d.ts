import { Schema, Document, Types } from 'mongoose';
export interface IMongoProject extends Document {
    name: string;
    promptGroupIds: Types.ObjectId[];
    agentIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
declare const projectSchema: Schema<IMongoProject, import("mongoose").Model<IMongoProject, any, any, any, Document<unknown, any, IMongoProject, any> & IMongoProject & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IMongoProject, Document<unknown, {}, import("mongoose").FlatRecord<IMongoProject>, {}> & import("mongoose").FlatRecord<IMongoProject> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default projectSchema;
