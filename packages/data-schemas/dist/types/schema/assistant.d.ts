import { Schema } from 'mongoose';
import type { IAssistant } from '~/types';
declare const assistantSchema: Schema<IAssistant, import("mongoose").Model<IAssistant, any, any, any, (import("mongoose").Document<unknown, any, IAssistant, any, import("mongoose").DefaultSchemaOptions> & IAssistant & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, IAssistant, any, import("mongoose").DefaultSchemaOptions> & IAssistant & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, IAssistant>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    actions?: import("mongoose").SchemaDefinitionProperty<string[] | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    avatar?: import("mongoose").SchemaDefinitionProperty<{
        filepath: string;
        source: string;
    } | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    user?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    file_ids?: import("mongoose").SchemaDefinitionProperty<string[] | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    assistant_id?: import("mongoose").SchemaDefinitionProperty<string, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    append_current_datetime?: import("mongoose").SchemaDefinitionProperty<boolean | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    access_level?: import("mongoose").SchemaDefinitionProperty<number | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    conversation_starters?: import("mongoose").SchemaDefinitionProperty<string[] | undefined, IAssistant, import("mongoose").Document<unknown, {}, IAssistant, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IAssistant & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IAssistant>;
export default assistantSchema;
