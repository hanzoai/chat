import { Schema } from 'mongoose';
import type * as t from '~/types';
declare const balanceSchema: Schema<t.IBalance, import("mongoose").Model<t.IBalance, any, any, any, import("mongoose").Document<unknown, any, t.IBalance, any> & t.IBalance & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, t.IBalance, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<t.IBalance>, {}> & import("mongoose").FlatRecord<t.IBalance> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default balanceSchema;
