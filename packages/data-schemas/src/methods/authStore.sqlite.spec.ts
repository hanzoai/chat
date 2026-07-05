/**
 * Regression proof for the P1 that broke COLD logins: the auth + billing methods
 * (Session / Token / User / Transaction) running against the SQLite document
 * store and the DualWriteModel — the two model shapes that
 * `createModels()` + `applySqliteOverrides()` serve once CHAT_STORE_SQLITE flips
 * these domains.
 *
 * Before the fix, `createSession` threw "Session is not a constructor" because
 * session.ts used the mongoose-document constructor (`new Session()`) + `.save()`,
 * which the served DocModel / DualWriteModel do not implement. Email-verify /
 * password-reset (Token) and the latent Transaction path were the same class of
 * bug (mongoose.models.<Name> / `new Transaction()`).
 *
 * These specs use the REAL production factories (createSessionMethods, …) and the
 * REAL `createModels` wiring — only the store backend is the SQLite one, exactly
 * as prod runs post-flip. No mongoose connection: the DocModel/DualWriteModel are
 * self-contained, so a failure here is a failure of the served auth path itself.
 */
import mongoose from 'mongoose';
import { createModels, closeSharedSqliteHandle } from '~/models';
import { createSqliteHandle, createDualWriteModel, type SqliteHandle } from '~/stores/sqlite';
import { createSessionMethods } from './session';
import { createTokenMethods } from './token';
import { createUserMethods } from './user';
import { createTransactionMethods } from './transaction';
import type { DataHandle } from '~/common/dataHandle';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// signRefreshToken / generateToken sign with these; creds.setup.cjs supplies
// CREDS_KEY/IV for hashToken. Set here (never clobbering) so the JWT signer works.
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const AUTH_NAMES = ['User', 'Session', 'Token', 'Balance', 'Transaction'];
/** Multiplier stubs: 1x prompt/completion, no cache multiplier. */
const stubTx = { getMultiplier: () => 1, getCacheMultiplier: () => null };
const oid = () => new mongoose.Types.ObjectId().toString();

/* ======================================================================== *
 *  Served shape #1: DualWriteModel (SQLite primary + SQLite mirror)         *
 *  — the model prod serves under CHAT_STORE_SQLITE + CHAT_STORE_DUALWRITE.  *
 * ======================================================================== */
describe('auth+billing methods on the DualWriteModel (SQLite primary + mirror)', () => {
  let primaryH: SqliteHandle;
  let mirrorH: SqliteHandle;
  let handle: DataHandle;
  let session: ReturnType<typeof createSessionMethods>;
  let token: ReturnType<typeof createTokenMethods>;
  let user: ReturnType<typeof createUserMethods>;
  let tx: ReturnType<typeof createTransactionMethods>;

  beforeEach(() => {
    primaryH = createSqliteHandle(AUTH_NAMES);
    mirrorH = createSqliteHandle(AUTH_NAMES);
    const models: Record<string, unknown> = {};
    for (const name of AUTH_NAMES) {
      models[name] = createDualWriteModel(primaryH.models[name], mirrorH.models[name]);
    }
    // Same handle shape createMethods builds in prod: store models + mongoose Types.
    handle = { models, Types: mongoose.Types } as DataHandle;
    session = createSessionMethods(handle);
    token = createTokenMethods(handle);
    user = createUserMethods(handle);
    tx = createTransactionMethods(handle, stubTx);
  });

  afterEach(() => {
    primaryH.close();
    mirrorH.close();
  });

  it('served models are the store wrapper, never a mongoose Model', () => {
    for (const name of AUTH_NAMES) {
      expect((handle.models[name] as any).constructor.name).toBe('DualWriteModel');
    }
  });

  describe('Session — createSession → findSession → updateExpiration → deleteSession', () => {
    it('creates a session (no `new Session()`), served + mirrored, and finds it by refresh token', async () => {
      const userId = oid();
      const { session: s, refreshToken } = await session.createSession(userId);

      expect(refreshToken).toBeTruthy();
      expect((s as any)._id).toBeTruthy();
      expect((s as any).refreshTokenHash).toBeTruthy();
      // never persisted in plaintext — the hash is not the token
      expect((s as any).refreshTokenHash).not.toBe(refreshToken);

      const found = await session.findSession({ refreshToken });
      expect(found).toBeTruthy();
      expect(String((found as any).user)).toBe(userId);

      // dual-write mirror received the session, keyed by the primary _id
      const mirrored = await mirrorH.models.Session.findOne({ _id: String((s as any)._id) }).lean();
      expect(mirrored).toBeTruthy();
    });

    it('findSession by sessionId, updateExpiration, and countActiveSessions', async () => {
      const userId = oid();
      const { session: s } = await session.createSession(userId);

      const byId = await session.findSession({ sessionId: String((s as any)._id) });
      expect(byId).toBeTruthy();

      const newExp = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      const updated = await session.updateExpiration(String((s as any)._id), newExp);
      expect(new Date((updated as any).expiration).getTime()).toBe(newExp.getTime());

      expect(await session.countActiveSessions(userId)).toBe(1);
    });

    it('generateRefreshToken rotates the hash on an existing session (bounded .updateOne)', async () => {
      const userId = oid();
      const { session: s, refreshToken: first } = await session.createSession(userId);

      const rotated = await session.generateRefreshToken(s as any);
      expect(rotated).toBeTruthy();
      expect(rotated).not.toBe(first);

      // new token resolves the same session; old token no longer matches
      const foundNew = await session.findSession({ refreshToken: rotated });
      expect(String((foundNew as any)._id)).toBe(String((s as any)._id));
      expect(await session.findSession({ refreshToken: first })).toBeNull();
    });

    it('deleteSession and deleteAllUserSessions remove served + mirrored rows', async () => {
      const userId = oid();
      const { session: s, refreshToken } = await session.createSession(userId);

      const del = await session.deleteSession({ sessionId: String((s as any)._id) });
      expect(del.deletedCount).toBe(1);
      expect(await session.findSession({ refreshToken })).toBeNull();

      await session.createSession(userId);
      await session.createSession(userId);
      const res = await session.deleteAllUserSessions(userId);
      expect(res.deletedCount).toBeGreaterThanOrEqual(2);
      expect(await session.countActiveSessions(userId)).toBe(0);
    });
  });

  describe('Token — createToken → findToken → updateToken → deleteTokens (verify/reset)', () => {
    it('runs the full email-verify token lifecycle against the store', async () => {
      const userId = oid();
      const created = await token.createToken({
        userId,
        token: 'verify-abc',
        identifier: 'ident-1',
        type: 'verify_email',
        expiresIn: 3600,
      } as any);
      expect(created).toBeTruthy();
      expect((created as any).expiresAt).toBeTruthy();

      // mirrored
      expect(await mirrorH.models.Token.findOne({ token: 'verify-abc' }).lean()).toBeTruthy();

      const found = await token.findToken({ token: 'verify-abc' });
      expect(found).toBeTruthy();
      expect(String((found as any).userId)).toBe(userId);

      const updated = await token.updateToken({ token: 'verify-abc' }, { expiresIn: 7200 });
      expect(updated).toBeTruthy();

      // consume
      const del = await token.deleteTokens({ token: 'verify-abc' });
      expect(del.deletedCount).toBe(1);
      expect(await token.findToken({ token: 'verify-abc' })).toBeNull();
    });

    it('findToken normalizes email to lowercase for case-insensitive lookup', async () => {
      await token.createToken({
        userId: oid(),
        email: 'reset@example.com',
        token: 'reset-1',
        expiresIn: 3600,
      } as any);
      const found = await token.findToken({ email: 'RESET@example.com' });
      expect(found).toBeTruthy();
      expect((found as any).token).toBe('reset-1');
    });
  });

  describe('User — createUser → findUser → getUserById → updateUser → deleteUserById', () => {
    it('creates and reads a user via the bounded API (no `new User()`)', async () => {
      const email = 'alice@example.com';
      const uid = await user.createUser({ email, name: 'Alice', provider: 'local' } as any);
      expect(uid).toBeTruthy();

      const found = await user.findUser({ email });
      expect(found).toBeTruthy();
      expect((found as any).name).toBe('Alice');

      const byId = await user.getUserById(String(uid));
      expect((byId as any).email).toBe(email);
      expect(await user.countUsers()).toBe(1);

      const updated = await user.updateUser(String(uid), { name: 'Alice II' } as any);
      expect((updated as any).name).toBe('Alice II');

      // mirrored
      expect(await mirrorH.models.User.findOne({ email }).lean()).toBeTruthy();

      const del = await user.deleteUserById(String(uid));
      expect(del.deletedCount).toBe(1);
      expect(await user.findUser({ email })).toBeNull();
    });

    it('createUser seeds a Balance when balanceConfig is enabled', async () => {
      const uid = await user.createUser(
        { email: 'bob@example.com', provider: 'local' } as any,
        { enabled: true, startBalance: 1000 } as any,
      );
      const bal = await tx.findBalanceByUser(String(uid));
      expect(bal).toBeTruthy();
      expect((bal as any).tokenCredits).toBe(1000);
    });
  });

  describe('Transaction — create/structured/auto-refill persist via .create() and debit balance', () => {
    it('createTransaction debits the balance and strips non-schema calculator inputs', async () => {
      const userId = oid();
      await tx.upsertBalanceFields(userId, { tokenCredits: 10000 } as any);

      const res = await tx.createTransaction({
        user: userId,
        tokenType: 'completion',
        rawAmount: -100,
        model: 'zen',
        endpointTokenConfig: { zen: { completion: 1 } },
        inputTokenCount: 7,
        balance: { enabled: true },
      } as any);

      expect(res).toBeTruthy();
      expect((res as any).user).toBe(userId);
      // stub multiplier = 1 → tokenValue = -100 → balance 10000 - 100
      expect((res as any).balance).toBe(9900);
      expect((res as any).completion).toBe(-100);

      const txns = await tx.getTransactions({ user: userId });
      expect(txns).toHaveLength(1);
      expect((txns[0] as any).tokenValue).toBe(-100);
      // mongoose strips non-schema paths on save; persistTransaction must match
      expect(txns[0]).not.toHaveProperty('endpointTokenConfig');
      expect(txns[0]).not.toHaveProperty('inputTokenCount');
    });

    it('createStructuredTransaction (prompt) and createAutoRefillTransaction work against the store', async () => {
      const userId = oid();
      await tx.upsertBalanceFields(userId, { tokenCredits: 5000 } as any);

      const structured = await tx.createStructuredTransaction({
        user: userId,
        tokenType: 'prompt',
        inputTokens: 10,
        writeTokens: 0,
        readTokens: 0,
        model: 'zen',
        balance: { enabled: true },
      } as any);
      expect(structured).toBeTruthy();
      // prompt path: tokenValue = -(10 * 1) = -10 → balance 5000 - 10
      expect((structured as any).balance).toBe(4990);

      const refill = await tx.createAutoRefillTransaction({
        user: userId,
        tokenType: 'credits',
        rawAmount: 500,
        context: 'autoRefill',
      } as any);
      expect(refill).toBeTruthy();
      expect((refill as any).transaction).toBeTruthy();

      const all = await tx.getTransactions({ user: userId });
      expect(all.length).toBeGreaterThanOrEqual(2);

      const cleared = await tx.deleteTransactions({ user: userId });
      expect((cleared as any).deletedCount).toBeGreaterThan(0);
      expect(await tx.getTransactions({ user: userId })).toHaveLength(0);
    });
  });
});

/* ======================================================================== *
 *  Served shape #2: the REAL createModels wiring under CHAT_STORE_SQLITE    *
 *  — proves the exact prod path serves a store model (DocModel), not        *
 *  mongoose, and that the auth flows run through it.                        *
 * ======================================================================== */
describe('real createModels wiring under CHAT_STORE_SQLITE serves DocModels', () => {
  let handle: DataHandle;
  let session: ReturnType<typeof createSessionMethods>;
  let token: ReturnType<typeof createTokenMethods>;

  beforeEach(() => {
    process.env.CHAT_STORE_SQLITE = AUTH_NAMES.join(',');
    delete process.env.CHAT_STORE_DUALWRITE;
    // Identical to createMethods' dbHandle: createModels output + mongoose Types.
    handle = { models: createModels(mongoose), Types: mongoose.Types };
    session = createSessionMethods(handle);
    token = createTokenMethods(handle);
  });

  afterEach(() => {
    delete process.env.CHAT_STORE_SQLITE;
    closeSharedSqliteHandle();
  });

  it('createModels serves DocModel for the flipped auth+billing domains (not mongoose)', () => {
    for (const name of AUTH_NAMES) {
      expect((handle.models[name] as any).constructor.name).toBe('DocModel');
    }
  });

  it('createSession → findSession → deleteSession against the SQLite-served store', async () => {
    const userId = oid();
    const { session: s, refreshToken } = await session.createSession(userId);
    expect(refreshToken).toBeTruthy();

    const found = await session.findSession({ refreshToken });
    expect(found).toBeTruthy();
    expect(String((found as any).user)).toBe(userId);

    const del = await session.deleteSession({ sessionId: String((s as any)._id) });
    expect(del.deletedCount).toBe(1);
    expect(await session.findSession({ refreshToken })).toBeNull();
  });

  it('createToken → findToken → deleteTokens against the SQLite-served store', async () => {
    const created = await token.createToken({
      userId: oid(),
      token: 'reset-xyz',
      identifier: 'r1',
      type: 'reset_password',
      expiresIn: 3600,
    } as any);
    expect(created).toBeTruthy();
    expect(await token.findToken({ token: 'reset-xyz' })).toBeTruthy();
    const del = await token.deleteTokens({ token: 'reset-xyz' });
    expect(del.deletedCount).toBe(1);
  });
});
