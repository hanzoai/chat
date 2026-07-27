/**
 * The auth router owns every credential step, at ONE prefix: `/v1/chat/auth`.
 *
 * Two things are asserted here.
 *
 * 1. Namespace. `POST /iam/session` (the IAM PKCE bridge the SPA uses to sign
 *    in) and the dormant server-side OIDC redirect pair used to hang off a
 *    top-level `/oauth` router. They are auth, they now live with auth, and
 *    nothing of chat's answers at the top level.
 *
 * 2. Rate-limiter scoping (regression). `loginLimiter` (LOGIN_MAX per 5 min,
 *    keyed by IP) was once blanket router middleware, which also covered the
 *    OIDC callback. Behind a shared LB/CDN IP the per-IP budget was exhausted
 *    instantly and the IdP code-exchange callback got 429 — aborting the token
 *    exchange and breaking login. The limiter belongs on the human-initiated
 *    GET that redirects to the IdP, never on the machine-driven callback.
 *
 * This mounts the REAL auth router with the REAL `loginLimiter` and stubs only
 * the heavy leaf deps (passport, openid-client, controllers, config, db).
 */
const express = require('express');
const request = require('supertest');

// passport.authenticate(...) -> a middleware that signals "reached the handler"
// (in prod this would redirect to the IdP for initiation, or exchange the code
// for callbacks). Returning 200 lets us detect whether the limiter intercepted
// the request with 429 BEFORE control reached the auth handler.
jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res) => res.status(200).json({ reached: true })),
}));

jest.mock('openid-client', () => ({
  randomState: jest.fn(() => 'test-state'),
}));

jest.mock('@hanzochat/data-schemas', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@hanzochat/data-provider', () => ({
  ErrorTypes: { AUTH_FAILED: 'AUTH_FAILED' },
  ViolationTypes: { LOGINS: 'logins' },
}));

// `limiterCache: () => undefined` makes express-rate-limit fall back to its
// built-in in-process MemoryStore (no Redis), same as the convos limiter test.
jest.mock('@hanzochat/api', () => ({
  createSetBalanceConfig: jest.fn(() => (req, res, next) => next()),
  limiterCache: jest.fn(() => undefined),
}));

// loginLimiter.js does `require('~/cache')` (the index, which also pulls
// getLogStores) and `require('~/server/utils')` (index, which pulls
// sendEmail/files/queue). Mock both indexes to the minimal real/inert surface
// the limiter actually uses: a no-op violation logger and the dependency-free
// `removePorts` IP key generator.
jest.mock('~/cache', () => ({
  logViolation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('~/server/utils', () => ({
  removePorts: jest.requireActual('~/server/utils/removePorts'),
}));

// The middleware index's full require graph is too heavy for a hermetic unit
// test. Mock the index but expose the REAL `loginLimiter` (the unit under test)
// via requireActual of the leaf file — mirroring how
// convos-duplicate-ratelimit.spec.js pulls the real forkLimiters. The rest are
// inert passthroughs (not under test here).
jest.mock('~/server/middleware', () => {
  const loginLimiter = jest.requireActual('~/server/middleware/limiters/loginLimiter');
  const pass = (req, res, next) => next();
  return {
    loginLimiter,
    logHeaders: pass,
    checkDomainAllowed: pass,
    requireJwtAuth: pass,
    checkBan: pass,
    guestTokenLimiter: pass,
  };
});

const reached = (name) => (req, res) => res.status(200).json({ handler: name });

jest.mock('~/server/controllers/auth/oauth', () => ({
  createOAuthHandler: jest.fn(() => (req, res) => res.status(200).json({ handler: true })),
}));
jest.mock('~/server/controllers/auth/iamSession', () => ({
  iamSessionController: (req, res) => res.status(200).json({ handler: 'iamSession' }),
}));
jest.mock('~/server/controllers/AuthController', () => ({
  graphTokenController: (req, res) => res.status(200).json({ handler: 'graphToken' }),
  refreshController: (req, res) => res.status(200).json({ handler: 'refresh' }),
}));
jest.mock('~/server/controllers/TwoFactorController', () => ({
  regenerateBackupCodes: (req, res) => res.sendStatus(200),
  disable2FA: (req, res) => res.sendStatus(200),
  confirm2FA: (req, res) => res.sendStatus(200),
  enable2FA: (req, res) => res.sendStatus(200),
  verify2FA: (req, res) => res.sendStatus(200),
}));
jest.mock('~/server/controllers/auth/TwoFactorAuthController', () => ({
  verify2FAWithTempToken: (req, res) => res.sendStatus(200),
}));
jest.mock('~/server/controllers/auth/LogoutController', () => ({
  logoutController: (req, res) => res.sendStatus(200),
}));
jest.mock('~/server/controllers/auth/GuestController', () => ({
  guestTokenController: (req, res) => res.sendStatus(200),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('~/db/models', () => ({
  Balance: {},
}));

const MOUNT = '/v1/chat/auth';
const IAM_SESSION = `${MOUNT}/iam/session`;
const LOGIN_INITIATION = `${MOUNT}/openid`;
const LOGIN_CALLBACK = `${MOUNT}/openid/callback`;

describe('auth router', () => {
  const savedEnv = {};

  beforeAll(() => {
    savedEnv.LOGIN_MAX = process.env.LOGIN_MAX;
    savedEnv.LOGIN_WINDOW = process.env.LOGIN_WINDOW;
    savedEnv.DOMAIN_CLIENT = process.env.DOMAIN_CLIENT;
    savedEnv.DOMAIN_SERVER = process.env.DOMAIN_SERVER;
  });

  afterAll(() => {
    for (const key of Object.keys(savedEnv)) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  // The limiter reads LOGIN_MAX/LOGIN_WINDOW at module-load time, so build the
  // app inside isolateModules AFTER setting env to get a fresh limiter+store.
  const buildApp = () => {
    let authRouter;
    jest.isolateModules(() => {
      authRouter = require('../auth');
    });
    const app = express();
    app.use(express.json());
    app.use(MOUNT, authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LOGIN_MAX = '1';
    process.env.LOGIN_WINDOW = '5';
    process.env.DOMAIN_CLIENT = 'http://localhost:3080';
    process.env.DOMAIN_SERVER = 'http://localhost:3080';
  });

  describe('namespace', () => {
    it('serves the IAM session bridge under the auth prefix', async () => {
      const res = await request(buildApp()).post(IAM_SESSION).send({ token: 'x' });
      expect(res.status).toBe(200);
      expect(res.body.handler).toBe('iamSession');
    });

    it('serves the OIDC redirect pair under the auth prefix', async () => {
      const app = buildApp();
      expect((await request(app).get(LOGIN_INITIATION)).status).toBe(200);
      expect((await request(app).get(LOGIN_CALLBACK)).status).toBe(200);
    });

    it('sends a failed OIDC callback to the error route inside the prefix', () => {
      let authRouter;
      let failureRedirects;
      jest.isolateModules(() => {
        authRouter = require('../auth');
        failureRedirects = require('passport')
          .authenticate.mock.calls.map(([, options]) => options?.failureRedirect)
          .filter(Boolean);
      });

      expect(authRouter.stack.some((l) => l.route?.path === '/error')).toBe(true);
      expect(failureRedirects).toContain('http://localhost:3080/v1/chat/auth/error');
    });
  });

  describe('initiation route (redirect-to-IdP) IS rate-limited', () => {
    it('returns 429 once an initiation route exceeds LOGIN_MAX', async () => {
      const app = buildApp();
      const max = parseInt(process.env.LOGIN_MAX, 10);

      for (let i = 0; i < max; i++) {
        const ok = await request(app).get(LOGIN_INITIATION);
        expect(ok.status).toBe(200);
        expect(ok.body.reached).toBe(true);
      }

      const limited = await request(app).get(LOGIN_INITIATION);
      expect(limited.status).toBe(429);
      expect(limited.body.message).toMatch(/too many/i);
    });
  });

  describe('callback route (IdP-returns-code) is NOT rate-limited', () => {
    it('never returns 429 even when hammered well past LOGIN_MAX', async () => {
      const app = buildApp();
      const hits = parseInt(process.env.LOGIN_MAX, 10) + 5;

      for (let i = 0; i < hits; i++) {
        const res = await request(app).get(LOGIN_CALLBACK);
        // The callback may legitimately 200/redirect/fail auth — it must just
        // never be throttled with 429.
        expect(res.status).not.toBe(429);
      }
    });

    it('does not consume the initiation budget (callback hits never trip the limiter)', async () => {
      const app = buildApp();

      // Hammer the callback far past the limit first.
      for (let i = 0; i < 10; i++) {
        const res = await request(app).get(LOGIN_CALLBACK);
        expect(res.status).not.toBe(429);
      }

      // The single allowed initiation request must still succeed: callbacks and
      // initiations do not share a (broken) blanket budget.
      const ok = await request(app).get(LOGIN_INITIATION);
      expect(ok.status).toBe(200);
    });
  });

  describe('router wiring (defense-in-depth structural assertion)', () => {
    // Even independent of runtime behavior, assert the limiter is present in the
    // initiation route's middleware stack and absent from the callback stack.
    const limiterStackByPath = () => {
      let authRouter;
      let loginLimiter;
      jest.isolateModules(() => {
        authRouter = require('../auth');
        // Same instance the router received (the mocked index re-exports the
        // real leaf limiter), so reference-equality in the stack is meaningful.
        ({ loginLimiter } = require('~/server/middleware'));
      });
      const byPath = {};
      for (const layer of authRouter.stack) {
        if (!layer.route) continue;
        const handles = layer.route.stack.map((s) => s.handle);
        byPath[layer.route.path] = handles.includes(loginLimiter);
      }
      return byPath;
    };

    it('applies loginLimiter to the initiation route and to NO callback route', () => {
      const limited = limiterStackByPath();

      expect(limited['/openid']).toBe(true);
      expect(limited['/openid/callback']).toBe(false);
      expect(limited['/iam/session']).toBe(false);
    });
  });
});
