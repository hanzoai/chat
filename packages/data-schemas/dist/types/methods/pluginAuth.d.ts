import type { DeleteResult } from 'mongoose';
import type { FindPluginAuthsByKeysParams, UpdatePluginAuthParams, DeletePluginAuthParams, FindPluginAuthParams, IPluginAuth } from '~/types';
export declare function createPluginAuthMethods(mongoose: typeof import('mongoose')): {
    findOnePluginAuth: ({ userId, authField, pluginKey, }: FindPluginAuthParams) => Promise<IPluginAuth | null>;
    findPluginAuthsByKeys: ({ userId, pluginKeys, }: FindPluginAuthsByKeysParams) => Promise<IPluginAuth[]>;
    updatePluginAuth: ({ userId, authField, pluginKey, value, }: UpdatePluginAuthParams) => Promise<IPluginAuth>;
    deletePluginAuth: ({ userId, authField, pluginKey, all, }: DeletePluginAuthParams) => Promise<DeleteResult>;
    deleteAllUserPluginAuths: (userId: string) => Promise<DeleteResult>;
};
export type PluginAuthMethods = ReturnType<typeof createPluginAuthMethods>;
