import mongoose from 'mongoose';
import type { IAction } from '~/types';
declare const Action: mongoose.Schema<IAction, mongoose.Model<IAction, any, any, any, (mongoose.Document<unknown, any, IAction, any, mongoose.DefaultSchemaOptions> & IAction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (mongoose.Document<unknown, any, IAction, any, mongoose.DefaultSchemaOptions> & IAction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}), any, IAction>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, IAction, mongoose.Document<unknown, {}, IAction, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    type?: mongoose.SchemaDefinitionProperty<string, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    user?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    metadata?: mongoose.SchemaDefinitionProperty<{
        api_key?: string;
        auth: {
            authorization_type?: string;
            custom_auth_header?: string;
            type: "service_http" | "oauth" | "none";
            authorization_content_type?: string;
            authorization_url?: string;
            client_url?: string;
            scope?: string;
            token_exchange_method: "default_post" | "basic_auth_header" | null;
        };
        domain: string;
        privacy_policy_url?: string;
        raw_spec?: string;
        oauth_client_id?: string;
        oauth_client_secret?: string;
    }, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    assistant_id?: mongoose.SchemaDefinitionProperty<string | undefined, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    agent_id?: mongoose.SchemaDefinitionProperty<string | undefined, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    action_id?: mongoose.SchemaDefinitionProperty<string, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    settings?: mongoose.SchemaDefinitionProperty<unknown, IAction, mongoose.Document<unknown, {}, IAction, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IAction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IAction>;
export default Action;
