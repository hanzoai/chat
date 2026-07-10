const express = require('express');
const request = require('supertest');

/**
 * Task #108 — guest streamed-reply 401.
 *
 * All chat streaming (incl. the guest "Hanzo" endpoint) is unified under
 * `GET /chat/stream/:streamId`. The bug: that route sat BELOW the blanket
 * `router.use(requireJwtAuth)`, whose `jwt` strategy rejects guest tokens by
 * design (`payload.guest === true → 401`). So a guest could START a generation
 * (the completion router accepts guests) but 401'd reading its own stream back →
 * empty bubble. The fix registers the route with `requireGuestOrJwtAuth` ABOVE
 * the strict guard; the handler's `job.metadata.userId !== req.user.id` ownership
 * check is the security boundary that keeps each guest pinned to its own job.
 *
 * This suite is fully mocked (no real winston/data-schemas/cloud client) so it
 * exercises ONLY the guest-vs-jwt gating + ownership of the read-back route.
 */

const mockGenerationJobManager = {
  getJob: jest.fn(),
  subscribe: jest.fn(),
  getResumeState: jest.fn(),
  getActiveJobIdsForUser: jest.fn().mockResolvedValue([]),
  abortJob: jest.fn(),
};

jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@hanzochat/api', () => ({
  isEnabled: jest.fn().mockReturnValue(false),
  GenerationJobManager: mockGenerationJobManager,
}));

jest.mock('~/models', () => ({ saveMessage: jest.fn() }));

jest.mock('~/server/routes/agents/chat', () => require('express').Router());
jest.mock('~/server/routes/agents/v1', () => ({ v1: require('express').Router() }));
jest.mock('~/server/routes/agents/openai', () => require('express').Router());
jest.mock('~/server/routes/agents/responses', () => require('express').Router());
jest.mock('~/server/routes/agents/cloud', () => require('express').Router());

// Per-test auth state. `mockGuest` set => the request carries a guest token.
let mockUserId = 'user-123';
let mockGuest = null;

jest.mock('~/server/middleware', () => ({
  uaParser: (req, res, next) => next(),
  checkBan: (req, res, next) => next(),
  configMiddleware: (req, res, next) => next(),
  messageIpLimiter: (req, res, next) => next(),
  messageUserLimiter: (req, res, next) => next(),
  enforceGuestScope: (req, res, next) => next(),
  guestMessageLimiter: (req, res, next) => next(),
  // Faithful to the real `jwt` strategy: guest tokens are rejected (401).
  requireJwtAuth: (req, res, next) => {
    if (mockGuest) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = { id: mockUserId };
    return next();
  },
  // Faithful to `requireGuestOrJwtAuth`: a guest token yields a guest principal,
  // otherwise it defers to the jwt path.
  requireGuestOrJwtAuth: (req, res, next) => {
    if (mockGuest) {
      req.user = { id: mockGuest, guest: true };
      return next();
    }
    req.user = { id: mockUserId };
    return next();
  },
}));

const agentsRouter = require('../index');
const app = express();
app.use(express.json());
app.use('/agents', agentsRouter);

function subscribeResolvesDone() {
  mockGenerationJobManager.subscribe.mockImplementation((_id, _onEvent, onDone) => {
    process.nextTick(() => onDone({ done: true }));
    return { unsubscribe: jest.fn() };
  });
}

describe('GET /chat/stream/:streamId — guest read-back (task #108)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'user-123';
    mockGuest = null;
    mockGenerationJobManager.getActiveJobIdsForUser.mockResolvedValue([]);
  });

  it('lets a guest read back the stream of ITS OWN job (200, not 401)', async () => {
    mockGuest = 'guest-abc';
    subscribeResolvesDone();
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: 'guest-abc' },
      status: 'running',
    });

    const res = await request(app).get('/agents/chat/stream/job-1');

    // Regression guard: before the fix a guest hit the strict `requireJwtAuth`
    // (registered globally below the route) and got 401 here.
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(mockGenerationJobManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when a guest requests ANOTHER principal's job (ownership boundary)", async () => {
    mockGuest = 'guest-abc';
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: 'someone-else' },
      status: 'running',
    });

    const res = await request(app).get('/agents/chat/stream/job-1');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockGenerationJobManager.subscribe).not.toHaveBeenCalled();
  });

  it('returns 404 to a guest when the job does not exist', async () => {
    mockGuest = 'guest-abc';
    mockGenerationJobManager.getJob.mockResolvedValue(null);

    const res = await request(app).get('/agents/chat/stream/missing');

    expect(res.status).toBe(404);
    expect(mockGenerationJobManager.subscribe).not.toHaveBeenCalled();
  });

  it('still serves an authenticated user their own stream (200)', async () => {
    subscribeResolvesDone();
    mockGenerationJobManager.getJob.mockResolvedValue({
      metadata: { userId: 'user-123' },
      status: 'running',
    });

    const res = await request(app).get('/agents/chat/stream/job-1');

    expect(res.status).toBe(200);
    expect(mockGenerationJobManager.subscribe).toHaveBeenCalledTimes(1);
  });
});
