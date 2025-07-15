import mongoose from 'mongoose';
import type { IAction } from '~/types';
declare const Action: mongoose.Schema<IAction, mongoose.Model<IAction, any, any, any, mongoose.Document<unknown, any, IAction, any> & IAction & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, IAction, mongoose.Document<unknown, {}, mongoose.FlatRecord<IAction>, {}> & mongoose.FlatRecord<IAction> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default Action;
