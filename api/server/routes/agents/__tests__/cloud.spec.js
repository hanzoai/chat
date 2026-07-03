jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

// The proxy keys the on-behalf-of decision off the VALIDATED principal
// (`req.user.provider`), not a cookie. requireJwtAuth is exercised elsewhere;
// here it simply installs the principal under test so the token-resolution +
// honest-error logic is isolated. Set `mockPrincipal` per test (the `mock`
// prefix is required for a jest.mock factory to reference it).
let mockPrincipal;
jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, _res, next) => {
    req.user = mockPrincipal;
    next();
  },
  // Rate limiter is exercised in its own layer; here it is a pass-through so the
  // proxy logic (token resolution, honest errors, name guard) is under test.
  cloudAgentLimiter: (_req, _res, next) => next(),
}));

const mockClient = {
  list: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};
jest.mock('~/server/services/CloudAgentsClient', () => ({
  getCloudAgentsClient: jest.fn(() => mockClient),
  // Boundary name validation in the route uses the real grammar.
  AGENT_NAME_RE: /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
}));

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const { getCloudAgentsClient } = require('~/server/services/CloudAgentsClient');
const cloudRouter = require('../cloud');

const OPENID_SUB = 'sub-abc-123';
const OPENID_USER = { id: 'u_openid', provider: 'openid', openidId: OPENID_SUB };
const LOCAL_USER = { id: 'u_local', provider: 'local' };

/**
 * Mint a decodable id_token. The signature is irrelevant to the proxy — it
 * decode-only checks `exp` + `sub`; cloud performs the authoritative JWKS
 * validation. So a throwaway secret is exactly right here.
 */
function mintIdToken({ sub = OPENID_SUB, exp = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  return jwt.sign({ sub, exp }, 'test-only-not-verified');
}

/**
 * Build an app whose session carries (or omits) the OpenID tokens the proxy
 * forwards to cloud. The authenticated principal is `mockPrincipal` (default: an
 * OpenID user); `cookie` models the httpOnly no-session fallback.
 */
function buildApp(session, cookie) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session;
    if (cookie != null && req.headers.cookie == null) {
      req.headers.cookie = cookie;
    }
    next();
  });
  app.use('/api/agents/cloud', cloudRouter);
  return app;
}

const VALID_ID = mintIdToken();
const withToken = { openidTokens: { idToken: VALID_ID, accessToken: 'ACC' } };

describe('cloud agents proxy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrincipal = OPENID_USER;
    getCloudAgentsClient.mockReturnValue(mockClient);
  });

  describe('token handling (no leak, fail-secure)', () => {
    it('401s when the openid principal has no hanzo.id session token', async () => {
      const res = await request(buildApp({})).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });

    it('forwards the session id_token (never the browser) to cloud', async () => {
      mockClient.list.mockResolvedValue({ agents: [{ name: 'researcher' }] });
      const res = await request(buildApp(withToken)).get('/api/agents/cloud');
      expect(res.status).toBe(200);
      expect(mockClient.list).toHaveBeenCalledWith(VALID_ID);
      expect(res.body).toEqual({ agents: [{ name: 'researcher' }], enabled: true });
    });

    it('falls back to access_token when no id_token', async () => {
      mockClient.list.mockResolvedValue({ agents: [] });
      const app = buildApp({ openidTokens: { accessToken: 'ONLY_ACC' } });
      await request(app).get('/api/agents/cloud');
      expect(mockClient.list).toHaveBeenCalledWith('ONLY_ACC');
    });

    it('reads the httpOnly openid_id_token cookie when the session is empty', async () => {
      mockClient.list.mockResolvedValue({ agents: [] });
      const app = buildApp({}, `openid_id_token=${VALID_ID}`);
      await request(app).get('/api/agents/cloud');
      expect(mockClient.list).toHaveBeenCalledWith(VALID_ID);
    });
  });

  describe('honest expiry + principal binding (never a fabricated session)', () => {
    it('honest 401 when the id_token is past its own exp (no forward)', async () => {
      const expired = mintIdToken({ exp: Math.floor(Date.now() / 1000) - 60 });
      const app = buildApp({ openidTokens: { idToken: expired } });
      const res = await request(app).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });

    it('honest 401 when the id_token names a different principal (sub mismatch)', async () => {
      const foreign = mintIdToken({ sub: 'sub-someone-else' });
      const app = buildApp({ openidTokens: { idToken: foreign } });
      const res = await request(app).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });

    it('honest 401 when the id_token is not a decodable JWT', async () => {
      const app = buildApp({ openidTokens: { idToken: 'not-a-jwt' } });
      const res = await request(app).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });
  });

  describe('principal guard (no confused deputy)', () => {
    it('401s and forwards nothing for a LOCAL principal, even with a valid openid session', async () => {
      // A local-JWT user whose browser still holds a valid prior openid session.
      // Forwarding those tokens would run as the wrong principal — deny at the
      // identity layer (req.user.provider), independent of any cookie.
      mockPrincipal = LOCAL_USER;
      const res = await request(buildApp(withToken)).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });

    it('401s for a principal that carries no provider', async () => {
      mockPrincipal = { id: 'u_unknown' };
      const res = await request(buildApp(withToken)).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });
  });

  describe('disabled deployment', () => {
    it('returns an empty, disabled list when cloud agents are not configured', async () => {
      getCloudAgentsClient.mockReturnValue(null);
      const res = await request(buildApp(withToken)).get('/api/agents/cloud');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ agents: [], enabled: false });
    });
  });

  describe('run', () => {
    it('forwards {input} and returns the RunResult', async () => {
      mockClient.run.mockResolvedValue({ id: 'run_1', status: 'ok', output: 'done' });
      const res = await request(buildApp(withToken))
        .post('/api/agents/cloud/researcher/run')
        .send({ input: 'summarize' });
      expect(res.status).toBe(200);
      expect(mockClient.run).toHaveBeenCalledWith(VALID_ID, 'researcher', 'summarize');
      expect(res.body.output).toBe('done');
    });

    it('surfaces an upstream error body with its status (honest failure)', async () => {
      const err = Object.assign(new Error('bad gateway'), {
        status: 502,
        body: { status: 'error', error: 'model down' },
      });
      mockClient.run.mockRejectedValue(err);
      const res = await request(buildApp(withToken))
        .post('/api/agents/cloud/researcher/run')
        .send({ input: 'x' });
      expect(res.status).toBe(502);
      expect(res.body).toEqual({ status: 'error', error: 'model down' });
    });

    it('maps a client-side validation error (bad name) to 400', async () => {
      const err = Object.assign(new Error('invalid agent name'), { status: 400 });
      mockClient.run.mockRejectedValue(err);
      const res = await request(buildApp(withToken))
        .post('/api/agents/cloud/researcher/run')
        .send({ input: 'x' });
      // simulate the client rejecting after the boundary let a valid name through
      expect(res.status).toBe(400);
    });
  });

  describe('boundary name validation (traversal / injection guard)', () => {
    // Each decodes (per Express) to a value outside cloud's handle grammar; the
    // route must reject at the boundary BEFORE constructing any client call.
    const smuggles = [
      '..%2Fetc', // -> ../etc
      '%2e%2e%2fadmin', // -> ../admin
      '..%5Cevil', // -> ..\evil
      'a%00b', // -> null byte
      'a%0dHost', // -> CR injection
      'a%20b', // -> space
    ];
    for (const name of smuggles) {
      it(`rejects "${name}" with 400 and never calls the client`, async () => {
        const res = await request(buildApp(withToken))
          .post(`/api/agents/cloud/${name}/run`)
          .send({ input: 'x' });
        expect(res.status).toBe(400);
        expect(mockClient.run).not.toHaveBeenCalled();
      });
    }

    it('rejects a bad name on GET /:name too', async () => {
      const res = await request(buildApp(withToken)).get('/api/agents/cloud/..%2Fetc');
      expect(res.status).toBe(400);
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });
});
