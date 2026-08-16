const express = require('express');
const request = require('supertest');

/**
 * The four reserved chat subpaths, from a GUEST's side.
 *
 * stream/active/status/abort are all deferred out of the guest-capable
 * chatRouter, so each one needs its own handler ABOVE the strict JWT guard to
 * stay reachable without a bearer. `status` and `abort` did not have one and
 * answered a guest 401 — which is a guest who cannot tell whether their own
 * reply is still running, and cannot stop it.
 *
 * The strict guard is mocked to REFUSE here, which is what it does to a caller
 * carrying no token. So a route that still answers is one registered above it,
 * and a route that 401s is one that is not.
 */

const mockGenerationJobManager = {
  getJob: jest.fn(),
  subscribe: jest.fn(),
  getResumeState: jest.fn(),
  abortJob: jest.fn(),
  getActiveJobIdsForUser: jest.fn().mockResolvedValue([]),
};

jest.mock('@hanzochat/data-schemas', () => ({
  ...jest.requireActual('@hanzochat/data-schemas'),
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@hanzochat/api', () => ({
  ...jest.requireActual('@hanzochat/api'),
  isEnabled: jest.fn().mockReturnValue(false),
  GenerationJobManager: mockGenerationJobManager,
}));

jest.mock('~/models', () => ({ saveMessage: jest.fn() }));

const GUEST = { id: 'guest_abc', role: 'GUEST', name: 'Guest', guest: true };

/**
 * Named middleware only; everything else passes through, for the reason the
 * sibling suite gives — a LIST of names has to track whatever the router mounts,
 * and a missed one makes express refuse the whole router at import.
 */
jest.mock('~/server/middleware', () => {
  const named = {
    requireJwtAuth: (req, res) => res.status(401).json({ error: 'Unauthorized' }),
    requireGuestOrJwtAuth: (req, res, next) => {
      req.user = { id: 'guest_abc', role: 'GUEST', name: 'Guest', guest: true };
      next();
    },
  };
  return new Proxy(named, {
    get: (target, key) => {
      if (key in target) {
        return target[key];
      }
      if (typeof key !== 'string' || key === 'then' || key === '__esModule') {
        return undefined;
      }
      return (req, res, next) => next();
    },
  });
});

jest.mock('~/server/routes/agents/chat', () => require('express').Router());
jest.mock('~/server/routes/agents/v1', () => ({ v1: require('express').Router() }));
jest.mock('~/server/routes/agents/openai', () => require('express').Router());
jest.mock('~/server/routes/agents/responses', () => require('express').Router());

const agentsRouter = require('../index');
const app = express();
app.use(express.json());
app.use('/agents', agentsRouter);

describe('a guest reaches the reserved subpaths that are their own', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the status of their own conversation', async () => {
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: GUEST.id },
      status: 'complete',
      createdAt: 1,
    });
    mockGenerationJobManager.getResumeState.mockResolvedValue(null);

    const res = await request(app).get('/agents/chat/status/convo-1');
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  it('stops their own generation', async () => {
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: GUEST.id },
      status: 'running',
    });
    mockGenerationJobManager.abortJob.mockResolvedValue({ success: true, jobData: {} });

    const res = await request(app).post('/agents/chat/abort').send({ streamId: 'convo-1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('is refused another principal’s conversation', async () => {
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: 'someone-else' },
      status: 'running',
    });

    const status = await request(app).get('/agents/chat/status/convo-2');
    expect(status.status).toBe(403);

    const abort = await request(app).post('/agents/chat/abort').send({ streamId: 'convo-2' });
    expect(abort.status).toBe(403);
  });

  it('is still refused the routes that are not theirs', async () => {
    const res = await request(app).get('/agents/chat/some-management-route');
    expect(res.status).toBe(401);
  });
});
