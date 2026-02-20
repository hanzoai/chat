import { Schema } from 'mongoose';
import { IUser } from '~/types';
declare const userSchema: Schema<IUser, import("mongoose").Model<IUser, any, any, any, (import("mongoose").Document<unknown, any, IUser, any, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, IUser, any, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, IUser>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IUser, import("mongoose").Document<unknown, {}, IUser, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    avatar?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    plugins?: import("mongoose").SchemaDefinitionProperty<string[] | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<string, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    username?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    emailVerified?: import("mongoose").SchemaDefinitionProperty<boolean, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    password?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    googleId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    facebookId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    openidId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    samlId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    ldapId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    githubId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    discordId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    appleId?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    twoFactorEnabled?: import("mongoose").SchemaDefinitionProperty<boolean | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totpSecret?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    backupCodes?: import("mongoose").SchemaDefinitionProperty<{
        codeHash: string;
        used: boolean;
        usedAt?: Date | null;
    }[] | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    refreshToken?: import("mongoose").SchemaDefinitionProperty<{
        refreshToken: string;
    }[] | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    termsAccepted?: import("mongoose").SchemaDefinitionProperty<boolean | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    personalization?: import("mongoose").SchemaDefinitionProperty<{
        memories?: boolean;
    } | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    favorites?: import("mongoose").SchemaDefinitionProperty<{
        agentId?: string;
        model?: string;
        endpoint?: string;
    }[] | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    idOnTheSource?: import("mongoose").SchemaDefinitionProperty<string | undefined, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, IUser, import("mongoose").Document<unknown, {}, IUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IUser>;
export default userSchema;
