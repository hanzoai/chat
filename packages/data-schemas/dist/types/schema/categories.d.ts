import { Schema, Document } from 'mongoose';
export interface ICategory extends Document {
    label: string;
    value: string;
}
declare const categoriesSchema: Schema<ICategory, import("mongoose").Model<ICategory, any, any, any, (Document<unknown, any, ICategory, any, import("mongoose").DefaultSchemaOptions> & ICategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, ICategory, any, import("mongoose").DefaultSchemaOptions> & ICategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, ICategory>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ICategory, Document<unknown, {}, ICategory, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ICategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    value?: import("mongoose").SchemaDefinitionProperty<string, ICategory, Document<unknown, {}, ICategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ICategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    label?: import("mongoose").SchemaDefinitionProperty<string, ICategory, Document<unknown, {}, ICategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ICategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, ICategory, Document<unknown, {}, ICategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ICategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ICategory>;
export default categoriesSchema;
