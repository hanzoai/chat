import { Schema } from 'mongoose';
import type { IAssistant } from '~/types';
declare const assistantSchema: Schema<IAssistant, import("mongoose").Model<IAssistant, any, any, any, import("mongoose").Document<unknown, any, IAssistant, any> & IAssistant & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IAssistant, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IAssistant>, {}> & import("mongoose").FlatRecord<IAssistant> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default assistantSchema;
