import { Schema } from 'mongoose';
import type { IPromptGroupDocument } from '~/types';
declare const promptGroupSchema: Schema<IPromptGroupDocument, import("mongoose").Model<IPromptGroupDocument, any, any, any, (import("mongoose").Document<unknown, any, IPromptGroupDocument, any, import("mongoose").DefaultSchemaOptions> & IPromptGroupDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, IPromptGroupDocument, any, import("mongoose").DefaultSchemaOptions> & IPromptGroupDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, IPromptGroupDocument>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    author?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    authorName?: import("mongoose").SchemaDefinitionProperty<string, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    projectIds?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId[], IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<string, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    command?: import("mongoose").SchemaDefinitionProperty<string | undefined, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isPublic?: import("mongoose").SchemaDefinitionProperty<boolean | undefined, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    numberOfGenerations?: import("mongoose").SchemaDefinitionProperty<number, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    oneliner?: import("mongoose").SchemaDefinitionProperty<string, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    productionId?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IPromptGroupDocument, import("mongoose").Document<unknown, {}, IPromptGroupDocument, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IPromptGroupDocument & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IPromptGroupDocument>;
export default promptGroupSchema;
