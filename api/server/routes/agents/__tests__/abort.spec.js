/**
 * Tests for the agent abort endpoint
 *
 * Tests the following fixes from PR #11462:
 * 1. Authorization check - only job owner can abort
 * 2. Early abort handling - skip save when no responseMessageId
 * 3. Partial response saving - save message before returning
 */

const express = require('express');
const request = require('supertest');

const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

const mockGenerationJobManager = {
  getJob: jest.fn(),
  abortJob: jest.fn(),
  getActiveJobIdsForUser: jest.fn(),
};

const mockSaveMessage = jest.fn();

jest.mock('@hanzochat/data-schemas', () => ({
  ...jest.requireActual('@hanzochat/data-schemas'),
  logger: mockLogger,
}));

jest.mock('@hanzochat/api', () => ({
  ...jest.requireActual('@hanzochat/api'),
  isEnabled: jest.fn().mockReturnValue(false),
  GenerationJobManager: mockGenerationJobManager,
}));

jest.mock('~/models', () => ({
  saveMessage: (...args) => mockSaveMessage(...args),
}));

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
    /* status and abort authenticate through this one, because a guest owns a
       generation too. Named for the same reason its sibling is: it decides WHO
       is asking, and a pass-through leaves the handler with no caller to
       compare the job against. */
    requireGuestOrJwtAuth: (req, res, next) => {
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

// Mock the chat module - needs to be a router
jest.mock('~/server/routes/agents/chat', () => require('express').Router());

// Mock the v1 module - v1 is directly used as middleware
jest.mock('~/server/routes/agents/v1', () => ({
  v1: require('express').Router(),
}));

// Import after mocks
const agentRoutes = require('~/server/routes/agents/index');

describe('Agent Abort Endpoint', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/chat/agents', agentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /chat/abort', () => {
    describe('Authorization', () => {
      it("should return 403 when user tries to abort another user's job", async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'other-user-456' },
        });

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Unauthorized' });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Unauthorized abort attempt'),
        );
        expect(mockGenerationJobManager.abortJob).not.toHaveBeenCalled();
      });

      it('should allow abort when user owns the job', async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'test-user-123' },
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: null,
          content: [],
          text: '',
        });

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, aborted: jobStreamId });
        expect(mockGenerationJobManager.abortJob).toHaveBeenCalledWith(jobStreamId);
      });

      it('should allow abort when job has no userId metadata (backwards compatibility)', async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: {},
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: null,
          content: [],
          text: '',
        });

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, aborted: jobStreamId });
      });
    });

    describe('Early Abort Handling', () => {
      it('should skip message saving when responseMessageId is missing (early abort)', async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'test-user-123' },
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: {
            userMessage: { messageId: 'user-msg-123' },
            // No responseMessageId - early abort before generation started
            conversationId: jobStreamId,
          },
          content: [],
          text: '',
        });

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(200);
        expect(mockSaveMessage).not.toHaveBeenCalled();
      });

      it('should skip message saving when userMessage is missing', async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'test-user-123' },
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: {
            // No userMessage
            responseMessageId: 'response-msg-123',
            conversationId: jobStreamId,
          },
          content: [],
          text: '',
        });

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(200);
        expect(mockSaveMessage).not.toHaveBeenCalled();
      });
    });

    describe('Partial Response Saving', () => {
      it('should save partial response when both userMessage and responseMessageId exist', async () => {
        const jobStreamId = 'test-stream-123';
        const userMessageId = 'user-msg-123';
        const responseMessageId = 'response-msg-456';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'test-user-123' },
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: {
            userMessage: { messageId: userMessageId },
            responseMessageId,
            conversationId: jobStreamId,
            sender: 'TestAgent',
            endpoint: 'anthropic',
            model: 'claude-3',
          },
          content: [{ type: 'text', text: 'Partial response...' }],
          text: 'Partial response...',
        });

        mockSaveMessage.mockResolvedValue();

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        expect(response.status).toBe(200);
        expect(mockSaveMessage).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            messageId: responseMessageId,
            parentMessageId: userMessageId,
            conversationId: jobStreamId,
            content: [{ type: 'text', text: 'Partial response...' }],
            text: 'Partial response...',
            sender: 'TestAgent',
            endpoint: 'anthropic',
            model: 'claude-3',
            unfinished: true,
            error: false,
            isCreatedByUser: false,
            user: 'test-user-123',
          }),
          expect.objectContaining({
            context: 'api/server/routes/agents/index.js - abort endpoint',
          }),
        );
      });

      it('should handle saveMessage errors gracefully', async () => {
        const jobStreamId = 'test-stream-123';

        mockGenerationJobManager.getJob.mockResolvedValue({
          metadata: { userId: 'test-user-123' },
        });

        mockGenerationJobManager.abortJob.mockResolvedValue({
          success: true,
          jobData: {
            userMessage: { messageId: 'user-msg-123' },
            responseMessageId: 'response-msg-456',
            conversationId: jobStreamId,
          },
          content: [],
          text: '',
        });

        mockSaveMessage.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: jobStreamId });

        // Should still return success even if save fails
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, aborted: jobStreamId });
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save partial response'),
        );
      });
    });

    describe('Job Not Found', () => {
      it('should return 404 when job is not found', async () => {
        mockGenerationJobManager.getJob.mockResolvedValue(null);
        mockGenerationJobManager.getActiveJobIdsForUser.mockResolvedValue([]);

        const response = await request(app)
          .post('/v1/chat/agents/chat/abort')
          .send({ conversationId: 'non-existent-job' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          error: 'Job not found',
          streamId: 'non-existent-job',
        });
      });
    });
  });
});
