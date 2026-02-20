import { Schema, Document, Types } from 'mongoose';
export interface IMongoProject extends Document {
    name: string;
    promptGroupIds: Types.ObjectId[];
    agentIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
declare const projectSchema: Schema<IMongoProject, import("mongoose").Model<IMongoProject, any, any, any, (Document<unknown, any, IMongoProject, any, import("mongoose").DefaultSchemaOptions> & IMongoProject & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, IMongoProject, any, import("mongoose").DefaultSchemaOptions> & IMongoProject & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, IMongoProject>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IMongoProject, Document<unknown, {}, IMongoProject, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    promptGroupIds?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    agentIds?: import("mongoose").SchemaDefinitionProperty<string[], IMongoProject, Document<unknown, {}, IMongoProject, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IMongoProject & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IMongoProject>;
export default projectSchema;
