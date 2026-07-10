/**
 * Proves the empty-response backstop in ResumableAgentController is WIRED to the
 * SSE error path: a completion that returns no content (a dead key / out-of-
 * credits stream that yields zero deltas without throwing) must surface as an
 * `emitError` — never a silent `emitDone` with an empty message.
 */

const { ContentTypes } = require('librechat-data-provider');

const mockGenerationJobManager = {
  createJob: jest.fn(),
  getJob: jest.fn(),
  emitDone: jest.fn(),
  emitError: jest.fn(),
  emitChunk: jest.fn(),
  completeJob: jest.fn(),
  updateMetadata: jest.fn(),
  setContentParts: jest.fn(),
  getResumeState: jest.fn().mockResolvedValue(null),
};

jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@hanzochat/api', () => ({
  sendEvent: jest.fn(),
  getViolationInfo: jest.fn(),
  GenerationJobManager: mockGenerationJobManager,
  decrementPendingRequest: jest.fn().mockResolvedValue(undefined),
  sanitizeFileForTransmit: jest.fn((file) => file),
  sanitizeMessageForTransmit: jest.fn((msg) => msg),
  checkAndIncrementPendingRequest: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('~/server/cleanup', () => ({
  disposeClient: jest.fn(),
  clientRegistry: null,
  requestDataMap: new Map(),
}));
jest.mock('~/server/middleware', () => ({ handleAbortError: jest.fn() }));
jest.mock('~/cache', () => ({ logViolation: jest.fn() }));
jest.mock('~/models', () => ({ saveMessage: jest.fn().mockResolvedValue(undefined) }));

const AgentController = require('../request');

/** Resolves once the controller settles onto a terminal emit (done or error). */
const runController = async (response) => {
  jest.clearAllMocks();
  mockGenerationJobManager.getResumeState.mockResolvedValue(null);

  const abortController = new AbortController();
  const createdAt = Date.now();
  mockGenerationJobManager.createJob.mockResolvedValue({
    createdAt,
    abortController,
    readyPromise: Promise.resolve(),
    emitter: { on: jest.fn() },
  });
  // Job is never "replaced" — same createdAt on re-read.
  mockGenerationJobManager.getJob.mockResolvedValue({ createdAt });

  const settled = new Promise((resolve) => {
    mockGenerationJobManager.emitError.mockImplementation(() => resolve('error'));
    mockGenerationJobManager.emitDone.mockImplementation(() => resolve('done'));
  });

  const client = {
    sender: 'AI',
    contentParts: [],
    sendMessage: jest.fn().mockResolvedValue({
      ...response,
      messageId: 'resp-1',
      databasePromise: Promise.resolve({ conversation: { conversationId: 'c1', title: 'T' } }),
    }),
  };
  const initializeClient = jest.fn().mockResolvedValue({ client });

  const req = {
    body: {
      text: 'hi',
      conversationId: 'new',
      parentMessageId: 'p1',
      endpointOption: { endpoint: 'agents', modelOptions: { model: 'zen5-mini' } },
    },
    user: { id: 'u1' },
  };
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

  await AgentController(req, res, jest.fn(), initializeClient, null);

  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('controller never settled')), 2000);
  });
  try {
    return await Promise.race([settled, guard]);
  } finally {
    clearTimeout(timer);
  }
};

describe('ResumableAgentController empty-response backstop', () => {
  it('emits an ERROR (not a silent done) when the response has no content', async () => {
    const outcome = await runController({ text: '', content: [] });

    expect(outcome).toBe('error');
    expect(mockGenerationJobManager.emitError).toHaveBeenCalledTimes(1);
    const [, message] = mockGenerationJobManager.emitError.mock.calls[0];
    expect(String(message)).toMatch(/empty response/i);
    expect(mockGenerationJobManager.emitDone).not.toHaveBeenCalled();
  });

  it('emits DONE normally when the response carries content', async () => {
    const outcome = await runController({
      text: '',
      content: [{ type: ContentTypes.TEXT, text: 'a real answer' }],
    });

    expect(outcome).toBe('done');
    expect(mockGenerationJobManager.emitDone).toHaveBeenCalledTimes(1);
    expect(mockGenerationJobManager.emitError).not.toHaveBeenCalled();
  });
});
