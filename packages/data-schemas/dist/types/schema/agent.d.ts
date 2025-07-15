import { Schema } from 'mongoose';
import type { IAgent } from '~/types';
declare const agentSchema: Schema<IAgent, import("mongoose").Model<IAgent, any, any, any, import("mongoose").Document<unknown, any, IAgent, any> & IAgent & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IAgent, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<IAgent>, {}> & import("mongoose").FlatRecord<IAgent> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export default agentSchema;
