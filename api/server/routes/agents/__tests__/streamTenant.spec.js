const express = require('express');
const request = require('supertest');

const mockGenerationJobManager = {
  getJob: jest.fn(),
  subscribe: jest.fn(),
  getResumeState: jest.fn(),
  abortJob: jest.fn(),
  getActiveJobIdsForUser: jest.fn().mockResolvedValue([]),
};

jest.mock('@hanzochat/data-schemas', () => ({
  ...jest.requireActual('@hanzochat/data-schemas'),
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@hanzochat/api', () => ({
  ...jest.requireActual('@hanzochat/api'),
  isEnabled: jest.fn().mockReturnValue(false),
  GenerationJobManager: mockGenerationJobManager,
}));

jest.mock('~/models', () => ({
  saveMessage: jest.fn(),
}));

let mockUserId = 'user-123';
let mockTenantId;

/**
 * Every middleware is a no-op except the ones named here.
 *
 * This was a LIST, and a list of middleware names has to be kept in step with
 * whatever the router happens to mount — miss one and express refuses the whole
 * router at import with `argument handler is required`, so the suite reports
 * zero tests. Three were missing in a row (`cloudAgentLimiter`,
 * `requireGuestOrJwtAuth`, `guestMessageLimiter`) and each fix revealed the
 * next. The proxy states the intent instead: this suite is about ROUTING, so
 * anything it does not name passes through.
 */
jest.mock('~/server/middleware', () => {
  const named = {
    requireJwtAuth: (req, res, next) => {
      req.user = { id: 'test-user-123' };
      next();
    },
  };
  return new Proxy(named, {
    get: (target, key) => {
      if (key in target) {
        return target[key];
      }
      // Never answer the interop probes — a thenable module breaks `require`.
      if (typeof key !== 'string' || key === 'then' || key === '__esModule') {
        return undefined;
      }
      return (req, res, next) => next();
    },
  });
});

jest.mock('~/server/routes/agents/chat', () => require('express').Router());
jest.mock('~/server/routes/agents/v1', () => ({
  v1: require('express').Router(),
}));
jest.mock('~/server/routes/agents/openai', () => require('express').Router());
jest.mock('~/server/routes/agents/responses', () => require('express').Router());

const agentsRouter = require('../index');
const app = express();
app.use(express.json());
app.use('/agents', agentsRouter);

function mockSubscribeSuccess() {
  mockGenerationJobManager.subscribe.mockImplementation((_streamId, _writeEvent, onDone) => {
    process.nextTick(() => onDone({ done: true }));
    return { unsubscribe: jest.fn() };
  });
}

describe('SSE stream tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'user-123';
    mockTenantId = undefined;
  });

  describe('GET /chat/stream/:streamId', () => {
    it('returns 403 when a user from a different tenant accesses a stream', async () => {
      mockUserId = 'user-456';
      mockTenantId = 'tenant-b';

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-456', tenantId: 'tenant-a' },
        status: 'running',
      });

      const res = await request(app).get('/agents/chat/stream/stream-123');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 404 when stream does not exist', async () => {
      mockGenerationJobManager.getJob.mockResolvedValue(null);

      const res = await request(app).get('/agents/chat/stream/nonexistent');
      expect(res.status).toBe(404);
    });

    it('proceeds past tenant guard when tenant matches', async () => {
      mockUserId = 'user-123';
      mockTenantId = 'tenant-a';
      mockSubscribeSuccess();

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123', tenantId: 'tenant-a' },
        status: 'running',
      });

      const res = await request(app).get('/agents/chat/stream/stream-123');
      expect(res.status).toBe(200);
      expect(mockGenerationJobManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('proceeds past tenant guard when job has no tenantId (single-tenant mode)', async () => {
      mockUserId = 'user-123';
      mockTenantId = undefined;
      mockSubscribeSuccess();

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123' },
        status: 'running',
      });

      const res = await request(app).get('/agents/chat/stream/stream-123');
      expect(res.status).toBe(200);
      expect(mockGenerationJobManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when job has tenantId but user has no tenantId', async () => {
      mockUserId = 'user-123';
      mockTenantId = undefined;

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123', tenantId: 'some-tenant' },
        status: 'running',
      });

      const res = await request(app).get('/agents/chat/stream/stream-123');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /chat/status/:conversationId', () => {
    it('returns 403 when tenant does not match', async () => {
      mockUserId = 'user-123';
      mockTenantId = 'tenant-b';

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123', tenantId: 'tenant-a' },
        status: 'running',
      });

      const res = await request(app).get('/agents/chat/status/conv-123');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns status when tenant matches', async () => {
      mockUserId = 'user-123';
      mockTenantId = 'tenant-a';

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123', tenantId: 'tenant-a' },
        status: 'running',
        createdAt: Date.now(),
      });
      mockGenerationJobManager.getResumeState.mockResolvedValue(null);

      const res = await request(app).get('/agents/chat/status/conv-123');
      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
    });
  });

  describe('POST /chat/abort', () => {
    it('returns 403 when tenant does not match', async () => {
      mockUserId = 'user-123';
      mockTenantId = 'tenant-b';

      mockGenerationJobManager.getJob.mockResolvedValue({
        metadata: { userId: 'user-123', tenantId: 'tenant-a' },
        status: 'running',
      });

      const res = await request(app).post('/agents/chat/abort').send({ streamId: 'stream-123' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
