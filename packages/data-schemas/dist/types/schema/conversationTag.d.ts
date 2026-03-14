import { Schema, Document } from 'mongoose';
export interface IConversationTag extends Document {
    tag?: string;
    user?: string;
    description?: string;
    count?: number;
    position?: number;
}
declare const conversationTag: Schema<IConversationTag, import("mongoose").Model<IConversationTag, any, any, any, Document<unknown, any, IConversationTag, any, {}> & IConversationTag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IConversationTag, Document<unknown, {}, import("mongoose").FlatRecord<IConversationTag>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<IConversationTag> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export default conversationTag;
