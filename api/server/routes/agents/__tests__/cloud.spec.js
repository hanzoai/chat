jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

// requireJwtAuth is exercised elsewhere; here we assert an authenticated user
// and focus on the cloud-agent proxy logic (token resolution, honest errors).
jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, _res, next) => {
    req.user = { id: 'user_1' };
    next();
  },
}));

const mockClient = {
  list: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};
jest.mock('~/server/services/CloudAgentsClient', () => ({
  getCloudAgentsClient: jest.fn(() => mockClient),
}));

const express = require('express');
const request = require('supertest');
const { getCloudAgentsClient } = require('~/server/services/CloudAgentsClient');
const cloudRouter = require('../cloud');

/**
 * Build an app whose session carries (or omits) the OpenID tokens the proxy
 * forwards to cloud.
 */
function buildApp(session) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session;
    next();
  });
  app.use('/api/agents/cloud', cloudRouter);
  return app;
}

const withToken = { openidTokens: { idToken: 'ID.JWT.SIG', accessToken: 'ACC' } };

describe('cloud agents proxy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCloudAgentsClient.mockReturnValue(mockClient);
  });

  describe('token handling (no leak, fail-secure)', () => {
    it('401s when the user has no hanzo.id session token', async () => {
      const res = await request(buildApp({})).get('/api/agents/cloud');
      expect(res.status).toBe(401);
      expect(mockClient.list).not.toHaveBeenCalled();
    });

    it('forwards the session id_token (never the browser) to cloud', async () => {
      mockClient.list.mockResolvedValue({ agents: [{ name: 'researcher' }] });
      const res = await request(buildApp(withToken)).get('/api/agents/cloud');
      expect(res.status).toBe(200);
      expect(mockClient.list).toHaveBeenCalledWith('ID.JWT.SIG');
      expect(res.body).toEqual({ agents: [{ name: 'researcher' }], enabled: true });
    });

    it('falls back to access_token when no id_token', async () => {
      mockClient.list.mockResolvedValue({ agents: [] });
      const app = buildApp({ openidTokens: { accessToken: 'ONLY_ACC' } });
      await request(app).get('/api/agents/cloud');
      expect(mockClient.list).toHaveBeenCalledWith('ONLY_ACC');
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
      expect(mockClient.run).toHaveBeenCalledWith('ID.JWT.SIG', 'researcher', 'summarize');
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
        .post('/api/agents/cloud/..%2Fetc/run')
        .send({ input: 'x' });
      expect(res.status).toBe(400);
    });
  });
});
