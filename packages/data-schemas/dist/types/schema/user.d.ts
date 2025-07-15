import { Schema } from 'mongoose';
import { IUser } from '~/types';
declare const userSchema: Schema<IUser, import("mongoose").Model<IUser, any, any, any, import("mongoose").Document<unknown, any, IUser, any> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IUser, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IUser>, {}> & import("mongoose").FlatRecord<IUser> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default userSchema;
