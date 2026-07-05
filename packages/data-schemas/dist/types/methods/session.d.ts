import type * as t from '~/types/session';
import type { DataHandle } from '~/common/dataHandle';
export declare class SessionError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
/** Default refresh token expiry: 7 days in milliseconds */
export declare const DEFAULT_REFRESH_TOKEN_EXPIRY: number;
/**
 * Factory that returns the session methods bound to a store-aware `DataHandle`
 * (the same seam the 28 migrated domains use). `handle.models.Session` resolves
 * to whichever backend `createModels()` + `applySqliteOverrides()` selected — a
 * mongoose `Model`, a SQLite `DocModel`, or a `DualWriteModel` — so every method
 * here speaks ONLY the bounded Model API (`.create/.findOne/.updateOne/
 * .findByIdAndUpdate/.deleteOne/.deleteMany/.countDocuments`). It never uses the
 * mongoose-document constructor (`new Session()`) or `doc.save()`, which are
 * absent from the document-store models and were the P1 that broke cold logins
 * once Session was flipped to the SQLite store.
 */
export declare function createSessionMethods(handle: DataHandle): {
    findSession: (params: t.SessionSearchParams, options?: t.SessionQueryOptions) => Promise<t.ISession | null>;
    SessionError: typeof SessionError;
    deleteSession: (params: t.DeleteSessionParams) => Promise<{
        deletedCount?: number;
    }>;
    createSession: (userId: string, options?: t.CreateSessionOptions) => Promise<t.SessionResult>;
    updateExpiration: (session: t.ISession | string, newExpiration?: Date, options?: t.UpdateExpirationOptions) => Promise<t.ISession>;
    countActiveSessions: (userId: string) => Promise<number>;
    generateRefreshToken: (session: t.ISession) => Promise<string>;
    deleteAllUserSessions: (userId: string | {
        userId: string;
    }, options?: t.DeleteAllSessionsOptions) => Promise<{
        deletedCount?: number;
    }>;
};
export type SessionMethods = ReturnType<typeof createSessionMethods>;
