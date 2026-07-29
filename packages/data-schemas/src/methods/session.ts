import type { Model } from 'mongoose';
import type * as t from '~/types/session';
import type { DataHandle } from '~/common/dataHandle';
import { signPayload, hashToken } from '~/crypto';
import logger from '~/config/winston';

export class SessionError extends Error {
  public code: string;

  constructor(message: string, code: string = 'SESSION_ERROR') {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

/** Default refresh token expiry: 7 days in milliseconds */
export const DEFAULT_REFRESH_TOKEN_EXPIRY = 1000 * 60 * 60 * 24 * 7;

/**
 * Factory that returns the session methods bound to a store-aware `DataHandle`
 * (the same seam the 28 migrated domains use). `handle.models.Session` resolves
 * to whichever backend `createModels()` + `applySqliteOverrides()` selected — a
 * mongoose `Model` or a SQLite `DocModel` — so every method
 * here speaks ONLY the bounded Model API (`.create/.findOne/.updateOne/
 * .findByIdAndUpdate/.deleteOne/.deleteMany/.countDocuments`). It never uses the
 * mongoose-document constructor (`new Session()`) or `doc.save()`, which are
 * absent from the document-store models and were the P1 that broke cold logins
 * once Session was flipped to the SQLite store.
 */
export function createSessionMethods(handle: DataHandle) {
  /**
   * The seam's ObjectId constructor. Both mongoose `Types.ObjectId` and the
   * SQLite handle's shim carry the static `isValid`, which the bare `DataHandle`
   * constructor type does not declare — so narrow it here at the single seam.
   */
  const objectIdCtor = () =>
    handle.Types!.ObjectId as unknown as {
      new (id?: unknown): { toString(): string };
      isValid(v: unknown): boolean;
    };

  /**
   * Signs a refresh-token JWT that binds the user and session ids. Kept internal
   * so both createSession (insert) and generateRefreshToken (rotate) sign with
   * identical claims + expiry math.
   */
  async function signRefreshToken(
    userId: unknown,
    sessionId: unknown,
    expiration?: Date,
  ): Promise<string> {
    const expiresAt = expiration ? expiration.getTime() : Date.now() + DEFAULT_REFRESH_TOKEN_EXPIRY;
    return await signPayload({
      payload: {
        id: userId,
        sessionId,
      },
      secret: process.env.JWT_REFRESH_SECRET!,
      expirationTime: Math.floor((expiresAt - Date.now()) / 1000),
    });
  }

  /**
   * Creates a new session for a user. Generates the session `_id` up front so the
   * refresh token can bind it, then persists the session (with its hashed refresh
   * token) in a single `.create()` — the store-agnostic equivalent of the old
   * `new Session({...})` + `session.save()`.
   */
  async function createSession(
    userId: string,
    options: t.CreateSessionOptions = {},
  ): Promise<t.SessionResult> {
    if (!userId) {
      throw new SessionError('User ID is required', 'INVALID_USER_ID');
    }

    const expiresIn = options.expiresIn ?? DEFAULT_REFRESH_TOKEN_EXPIRY;

    try {
      const Session = handle.models.Session as Model<t.ISession>;
      const expiration = options.expiration || new Date(Date.now() + expiresIn);
      const _id = new (objectIdCtor())();
      const refreshToken = await signRefreshToken(userId, _id, expiration);
      const refreshTokenHash = await hashToken(refreshToken);

      const session = (await Session.create({
        _id,
        user: userId,
        expiration,
        refreshTokenHash,
      } as unknown as t.ISession)) as unknown as t.ISession;

      return { session, refreshToken };
    } catch (error) {
      logger.error('[createSession] Error creating session:', error);
      throw new SessionError('Failed to create session', 'CREATE_SESSION_FAILED');
    }
  }

  /**
   * Finds a session by various parameters
   */
  async function findSession(
    params: t.SessionSearchParams,
    options: t.SessionQueryOptions = { lean: true },
  ): Promise<t.ISession | null> {
    try {
      const Session = handle.models.Session as Model<t.ISession>;
      const query: Record<string, unknown> = {};

      if (!params.refreshToken && !params.userId && !params.sessionId) {
        throw new SessionError(
          'At least one search parameter is required',
          'INVALID_SEARCH_PARAMS',
        );
      }

      if (params.refreshToken) {
        const tokenHash = await hashToken(params.refreshToken);
        query.refreshTokenHash = tokenHash;
      }

      if (params.userId) {
        query.user = params.userId;
      }

      if (params.sessionId) {
        const sessionId =
          typeof params.sessionId === 'object' &&
          params.sessionId !== null &&
          'sessionId' in params.sessionId
            ? (params.sessionId as { sessionId: string }).sessionId
            : (params.sessionId as string);
        if (!objectIdCtor().isValid(sessionId)) {
          throw new SessionError('Invalid session ID format', 'INVALID_SESSION_ID');
        }
        query._id = sessionId;
      }

      // Add expiration check to only return valid sessions
      query.expiration = { $gt: new Date() };

      const sessionQuery = Session.findOne(query);

      if (options.lean) {
        return (await sessionQuery.lean()) as t.ISession | null;
      }

      return (await sessionQuery.exec()) as t.ISession | null;
    } catch (error) {
      logger.error('[findSession] Error finding session:', error);
      throw new SessionError('Failed to find session', 'FIND_SESSION_FAILED');
    }
  }

  /**
   * Updates session expiration. Accepts either a session id or a session object;
   * persists the new expiration via the bounded `.findByIdAndUpdate()` (was
   * `doc.save()`), returning the updated session.
   */
  async function updateExpiration(
    session: t.ISession | string,
    newExpiration?: Date,
    options: t.UpdateExpirationOptions = {},
  ): Promise<t.ISession> {
    const expiresIn = options.expiresIn ?? DEFAULT_REFRESH_TOKEN_EXPIRY;

    try {
      const Session = handle.models.Session as Model<t.ISession>;
      const sessionId = typeof session === 'string' ? session : session?._id;
      if (sessionId == null) {
        throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
      }

      const expiration = newExpiration || new Date(Date.now() + expiresIn);
      const updated = (await Session.findByIdAndUpdate(
        sessionId as string,
        { $set: { expiration } },
        { new: true },
      )) as unknown as t.ISession | null;

      if (!updated) {
        throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
      }

      return updated;
    } catch (error) {
      logger.error('[updateExpiration] Error updating session:', error);
      throw new SessionError('Failed to update session expiration', 'UPDATE_EXPIRATION_FAILED');
    }
  }

  /**
   * Deletes a session by refresh token or session ID
   */
  async function deleteSession(params: t.DeleteSessionParams): Promise<{ deletedCount?: number }> {
    try {
      const Session = handle.models.Session as Model<t.ISession>;
      if (!params.refreshToken && !params.sessionId) {
        throw new SessionError(
          'Either refreshToken or sessionId is required',
          'INVALID_DELETE_PARAMS',
        );
      }

      const query: Record<string, unknown> = {};

      if (params.refreshToken) {
        query.refreshTokenHash = await hashToken(params.refreshToken);
      }

      if (params.sessionId) {
        query._id = params.sessionId;
      }

      const result = await Session.deleteOne(query);

      if (result.deletedCount === 0) {
        logger.warn('[deleteSession] No session found to delete');
      }

      return result;
    } catch (error) {
      logger.error('[deleteSession] Error deleting session:', error);
      throw new SessionError('Failed to delete session', 'DELETE_SESSION_FAILED');
    }
  }

  /**
   * Deletes all sessions for a user
   */
  async function deleteAllUserSessions(
    userId: string | { userId: string },
    options: t.DeleteAllSessionsOptions = {},
  ): Promise<{ deletedCount?: number }> {
    try {
      const Session = handle.models.Session as Model<t.ISession>;
      if (!userId) {
        throw new SessionError('User ID is required', 'INVALID_USER_ID');
      }

      const userIdString =
        typeof userId === 'object' && userId !== null ? userId.userId : (userId as string);

      if (!objectIdCtor().isValid(userIdString)) {
        throw new SessionError('Invalid user ID format', 'INVALID_USER_ID_FORMAT');
      }

      const query: Record<string, unknown> = { user: userIdString };

      if (options.excludeCurrentSession && options.currentSessionId) {
        query._id = { $ne: options.currentSessionId };
      }

      const result = await Session.deleteMany(query);

      if (result.deletedCount && result.deletedCount > 0) {
        logger.debug(
          `[deleteAllUserSessions] Deleted ${result.deletedCount} sessions for user ${userIdString}.`,
        );
      }

      return result;
    } catch (error) {
      logger.error('[deleteAllUserSessions] Error deleting user sessions:', error);
      throw new SessionError('Failed to delete user sessions', 'DELETE_ALL_SESSIONS_FAILED');
    }
  }

  /**
   * Rotates the refresh token for an EXISTING (already-persisted) session: signs a
   * fresh token bound to the session, then persists the new hash via the bounded
   * `.updateOne()` (was `doc.save()`). The initial insert lives in createSession.
   */
  async function generateRefreshToken(session: t.ISession): Promise<string> {
    if (!session || !session.user) {
      throw new SessionError('Invalid session object', 'INVALID_SESSION');
    }

    try {
      const expiration =
        session.expiration ?? new Date(Date.now() + DEFAULT_REFRESH_TOKEN_EXPIRY);

      if (!session.expiration) {
        session.expiration = expiration;
      }

      const refreshToken = await signRefreshToken(session.user, session._id, expiration);
      const refreshTokenHash = await hashToken(refreshToken);
      session.refreshTokenHash = refreshTokenHash;

      const Session = handle.models.Session as Model<t.ISession>;
      await Session.updateOne(
        { _id: session._id },
        { $set: { refreshTokenHash } },
      );

      return refreshToken;
    } catch (error) {
      logger.error('[generateRefreshToken] Error generating refresh token:', error);
      throw new SessionError('Failed to generate refresh token', 'GENERATE_TOKEN_FAILED');
    }
  }

  /**
   * Counts active sessions for a user
   */
  async function countActiveSessions(userId: string): Promise<number> {
    try {
      const Session = handle.models.Session as Model<t.ISession>;
      if (!userId) {
        throw new SessionError('User ID is required', 'INVALID_USER_ID');
      }

      return await Session.countDocuments({
        user: userId,
        expiration: { $gt: new Date() },
      });
    } catch (error) {
      logger.error('[countActiveSessions] Error counting active sessions:', error);
      throw new SessionError('Failed to count active sessions', 'COUNT_SESSIONS_FAILED');
    }
  }

  return {
    findSession,
    SessionError,
    deleteSession,
    createSession,
    updateExpiration,
    countActiveSessions,
    generateRefreshToken,
    deleteAllUserSessions,
  };
}

export type SessionMethods = ReturnType<typeof createSessionMethods>;
