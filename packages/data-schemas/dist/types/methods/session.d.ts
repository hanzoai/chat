import type * as t from '~/types/session';
export declare class SessionError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
export declare function createSessionMethods(mongoose: typeof import('mongoose')): {
    findSession: (params: t.SessionSearchParams, options?: t.SessionQueryOptions) => Promise<t.ISession | null>;
    SessionError: typeof SessionError;
    deleteSession: (params: t.DeleteSessionParams) => Promise<{
        deletedCount?: number;
    }>;
    createSession: (userId: string, options?: t.CreateSessionOptions) => Promise<t.SessionResult>;
    updateExpiration: (session: t.ISession | string, newExpiration?: Date) => Promise<t.ISession>;
    countActiveSessions: (userId: string) => Promise<number>;
    generateRefreshToken: (session: t.ISession) => Promise<string>;
    deleteAllUserSessions: (userId: string | {
        userId: string;
    }, options?: t.DeleteAllSessionsOptions) => Promise<{
        deletedCount?: number;
    }>;
};
export type SessionMethods = ReturnType<typeof createSessionMethods>;
