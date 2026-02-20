import { Schema, Document } from 'mongoose';
export interface IBanner extends Document {
    bannerId: string;
    message: string;
    displayFrom: Date;
    displayTo?: Date;
    type: 'banner' | 'popup';
    isPublic: boolean;
    persistable: boolean;
}
declare const bannerSchema: Schema<IBanner, import("mongoose").Model<IBanner, any, any, any, (Document<unknown, any, IBanner, any, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, IBanner, any, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, IBanner>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IBanner, Document<unknown, {}, IBanner, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    message?: import("mongoose").SchemaDefinitionProperty<string, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<"banner" | "popup", IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    bannerId?: import("mongoose").SchemaDefinitionProperty<string, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    displayFrom?: import("mongoose").SchemaDefinitionProperty<Date, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    displayTo?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isPublic?: import("mongoose").SchemaDefinitionProperty<boolean, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    persistable?: import("mongoose").SchemaDefinitionProperty<boolean, IBanner, Document<unknown, {}, IBanner, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IBanner>;
export default bannerSchema;
