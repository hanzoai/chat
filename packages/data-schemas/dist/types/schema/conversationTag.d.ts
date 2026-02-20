import { Schema, Document } from 'mongoose';
export interface IConversationTag extends Document {
    tag?: string;
    user?: string;
    description?: string;
    count?: number;
    position?: number;
}
declare const conversationTag: Schema<IConversationTag, import("mongoose").Model<IConversationTag, any, any, any, (Document<unknown, any, IConversationTag, any, import("mongoose").DefaultSchemaOptions> & IConversationTag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, IConversationTag, any, import("mongoose").DefaultSchemaOptions> & IConversationTag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, IConversationTag>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IConversationTag, Document<unknown, {}, IConversationTag, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    user?: import("mongoose").SchemaDefinitionProperty<string | undefined, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | undefined, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tag?: import("mongoose").SchemaDefinitionProperty<string | undefined, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    position?: import("mongoose").SchemaDefinitionProperty<number | undefined, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    count?: import("mongoose").SchemaDefinitionProperty<number | undefined, IConversationTag, Document<unknown, {}, IConversationTag, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IConversationTag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IConversationTag>;
export default conversationTag;
