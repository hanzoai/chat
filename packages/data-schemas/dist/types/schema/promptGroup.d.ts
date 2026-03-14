import { Schema } from 'mongoose';
import type { IPromptGroupDocument } from '~/types';
declare const promptGroupSchema: Schema<IPromptGroupDocument, import("mongoose").Model<IPromptGroupDocument, any, any, any, import("mongoose").Document<unknown, any, IPromptGroupDocument, any, {}> & IPromptGroupDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IPromptGroupDocument, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IPromptGroupDocument>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<IPromptGroupDocument> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export default promptGroupSchema;
