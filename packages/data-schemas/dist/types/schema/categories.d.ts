import { Schema, Document } from 'mongoose';
export interface ICategory extends Document {
    label: string;
    value: string;
}
declare const categoriesSchema: Schema<ICategory, import("mongoose").Model<ICategory, any, any, any, Document<unknown, any, ICategory, any> & ICategory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ICategory, Document<unknown, {}, import("mongoose").FlatRecord<ICategory>, {}> & import("mongoose").FlatRecord<ICategory> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default categoriesSchema;
