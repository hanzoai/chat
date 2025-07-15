import type * as t from '~/types';
/** Factory function that takes mongoose instance and returns the methods */
export declare function createShareMethods(mongoose: typeof import('mongoose')): {
    getSharedLink: (user: string, conversationId: string) => Promise<t.GetShareLinkResult>;
    getSharedLinks: (user: string, pageParam?: Date, pageSize?: number, isPublic?: boolean, sortBy?: string, sortDirection?: string, search?: string) => Promise<t.SharedLinksResult>;
    createSharedLink: (user: string, conversationId: string) => Promise<t.CreateShareResult>;
    updateSharedLink: (user: string, shareId: string) => Promise<t.UpdateShareResult>;
    deleteSharedLink: (user: string, shareId: string) => Promise<t.DeleteShareResult | null>;
    getSharedMessages: (shareId: string) => Promise<t.SharedMessagesResult | null>;
    deleteAllSharedLinks: (user: string) => Promise<t.DeleteAllSharesResult>;
};
export type ShareMethods = ReturnType<typeof createShareMethods>;
