/**
 * Regression test for the OAuth login rate-limiter scoping fix.
 *
 * Background: `loginLimiter` (LOGIN_MAX per 5 min, keyed by IP) used to be
 * applied as blanket router middleware (`router.use(loginLimiter)`), which also
 * covered the OIDC/social callback routes. Behind a shared LB/CDN IP, with
 * OPENID_AUTO_REDIRECT firing `/oauth/openid` on every page load, the per-IP
 * budget was exhausted instantly and the IdP code-exchange callback got 429 -
 * aborting the token exchange and breaking login.
 *
 * The fix scopes `loginLimiter` to the human-initiated entry points (the GETs
 * that REDIRECT to the IdP) and leaves the machine-driven callback routes
 * (the IdP returning a one-time code) un-limited.
 *
 * This test mounts the REAL oauth router with the REAL `loginLimiter` and only
 * stubs the heavy leaf deps (passport, openid-client, controllers, config, db),
 * mirroring server/routes/__tests__/convos-duplicate-ratelimit.spec.js.
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

jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('librechat-data-provider', () => ({
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

// oauth.js imports { checkDomainAllowed, loginLimiter, logHeaders } from the
// middleware index, whose full require graph is too heavy for a hermetic unit
// test. Mock the index but expose the REAL `loginLimiter` (the unit under test)
// via requireActual of the leaf file — mirroring how
// convos-duplicate-ratelimit.spec.js pulls the real forkLimiters. The other two
// are inert passthroughs (not under test here).
jest.mock('~/server/middleware', () => {
  const loginLimiter = jest.requireActual('~/server/middleware/limiters/loginLimiter');
  return {
    loginLimiter,
    logHeaders: (req, res, next) => next(),
    checkDomainAllowed: (req, res, next) => next(),
  };
});

jest.mock('~/server/controllers/auth/oauth', () => ({
  createOAuthHandler: jest.fn(() => (req, res) => res.status(200).json({ handler: true })),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('~/db/models', () => ({
  Balance: {},
}));

const LOGIN_INITIATION = '/oauth/openid';
const LOGIN_CALLBACK = '/oauth/openid/callback';

describe('OAuth router — loginLimiter scoping', () => {
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
    let oauthRouter;
    jest.isolateModules(() => {
      oauthRouter = require('../oauth');
    });
    const app = express();
    app.use(express.json());
    app.use('/oauth', oauthRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LOGIN_MAX = '1';
    process.env.LOGIN_WINDOW = '5';
    process.env.DOMAIN_CLIENT = 'http://localhost:3080';
    process.env.DOMAIN_SERVER = 'http://localhost:3080';
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
    // initiation route's middleware stack and absent from every callback stack.
    const limiterStackByPath = () => {
      let oauthRouter;
      let loginLimiter;
      jest.isolateModules(() => {
        oauthRouter = require('../oauth');
        // Same instance the router received (the mocked index re-exports the
        // real leaf limiter), so reference-equality in the stack is meaningful.
        ({ loginLimiter } = require('~/server/middleware'));
      });
      const byPath = {};
      for (const layer of oauthRouter.stack) {
        if (!layer.route) continue; // skip router.use(logHeaders) etc.
        const handles = layer.route.stack.map((s) => s.handle);
        byPath[layer.route.path] = handles.includes(loginLimiter);
      }
      return byPath;
    };

    it('applies loginLimiter to every initiation route and to NO callback route', () => {
      const limited = limiterStackByPath();

      const initiationRoutes = [
        '/google',
        '/facebook',
        '/openid',
        '/github',
        '/discord',
        '/apple',
        '/saml',
      ];
      const callbackRoutes = [
        '/google/callback',
        '/facebook/callback',
        '/openid/callback',
        '/github/callback',
        '/discord/callback',
        '/apple/callback',
        '/saml/callback',
      ];

      for (const path of initiationRoutes) {
        expect(limited[path]).toBe(true);
      }
      for (const path of callbackRoutes) {
        expect(limited[path]).toBe(false);
      }
    });
  });
});
