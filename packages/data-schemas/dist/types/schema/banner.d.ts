import { Schema, Document } from 'mongoose';
export interface IBanner extends Document {
    bannerId: string;
    message: string;
    displayFrom: Date;
    displayTo?: Date;
    type: 'banner' | 'popup';
    isPublic: boolean;
}
declare const bannerSchema: Schema<IBanner, import("mongoose").Model<IBanner, any, any, any, Document<unknown, any, IBanner, any> & IBanner & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IBanner, Document<unknown, {}, import("mongoose").FlatRecord<IBanner>, {}> & import("mongoose").FlatRecord<IBanner> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default bannerSchema;
