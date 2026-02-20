import { Schema } from 'mongoose';
import type * as t from '~/types';
declare const balanceSchema: Schema<t.IBalance, import("mongoose").Model<t.IBalance, any, any, any, (import("mongoose").Document<unknown, any, t.IBalance, any, import("mongoose").DefaultSchemaOptions> & t.IBalance & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, t.IBalance, any, import("mongoose").DefaultSchemaOptions> & t.IBalance & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, t.IBalance>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    user?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    autoRefillEnabled?: import("mongoose").SchemaDefinitionProperty<boolean, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    refillIntervalValue?: import("mongoose").SchemaDefinitionProperty<number, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    refillIntervalUnit?: import("mongoose").SchemaDefinitionProperty<"seconds" | "minutes" | "hours" | "days" | "weeks" | "months", t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    refillAmount?: import("mongoose").SchemaDefinitionProperty<number, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenCredits?: import("mongoose").SchemaDefinitionProperty<number, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastRefill?: import("mongoose").SchemaDefinitionProperty<Date, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    creditsGrantedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, t.IBalance, import("mongoose").Document<unknown, {}, t.IBalance, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<t.IBalance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, t.IBalance>;
export default balanceSchema;
