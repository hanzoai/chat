import { renderHook } from '@testing-library/react';
import type { TSubmission } from '@hanzochat/data-provider';

/**
 * The completion path's stale-bearer refusal is a **403**, not a 401, and it says
 * so on purpose: `requireGuestOrJwtAuth` has already admitted the caller, so chat's
 * own JWT is fine and only the forwarded IAM bearer aged out
 * (packages/api/src/endpoints/custom/initialize.ts throws EXPIRED_BEARER/403).
 *
 * This hook only ever listened for 401, so the one status the server actually
 * returns fell through to `errorHandler` and printed "Your Hanzo session needs
 * refreshing — reload the page and try again" at someone already signed in, an
 * hour into a good session. These tests pin the 403 leg so it cannot regress to
 * "reload the page" again.
 */

type SSEEventListener = (e: Partial<MessageEvent> & { responseCode?: number }) => void;

interface MockSSEInstance {
  addEventListener: jest.Mock;
  stream: jest.Mock;
  close: jest.Mock;
  headers: Record<string, string>;
  _listeners: Record<string, SSEEventListener>;
  _emit: (event: string, data?: Partial<MessageEvent> & { responseCode?: number }) => void;
}

const mockSSEInstances: MockSSEInstance[] = [];

jest.mock('sse.js', () => ({
  SSE: jest.fn().mockImplementation(() => {
    const listeners: Record<string, SSEEventListener> = {};
    const instance: MockSSEInstance = {
      addEventListener: jest.fn((event: string, cb: SSEEventListener) => {
        listeners[event] = cb;
      }),
      stream: jest.fn(),
      close: jest.fn(),
      headers: {},
      _listeners: listeners,
      _emit: (event, data = {}) => listeners[event]?.(data as MessageEvent),
    };
    mockSSEInstances.push(instance);
    return instance;
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    getQueryCache: () => ({ findAll: () => [] }),
  }),
}));

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useSetAtom: () => jest.fn(),
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    activeRunFamily: jest.fn(),
    abortScrollFamily: jest.fn(),
    showStopButtonByIndex: jest.fn(),
  },
}));

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => ({ token: 'chat-jwt', isAuthenticated: true }),
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { balance: { enabled: false } } }),
  useGetUserBalance: () => ({ refetch: jest.fn() }),
}));

jest.mock('@hanzo/event/react', () => ({ useAnalytics: () => ({ capture: jest.fn() }) }));
jest.mock('@hanzo/event', () => ({ EVENTS: { GENERATION_FAILED: 'generation_failed' } }));

const mockErrorHandler = jest.fn();
jest.mock('~/hooks/SSE/useEventHandlers', () =>
  jest.fn(() => ({
    errorHandler: mockErrorHandler,
    finalHandler: jest.fn(),
    createdHandler: jest.fn(),
    attachmentHandler: jest.fn(),
    stepHandler: jest.fn(),
    contentHandler: jest.fn(),
    resetContentHandler: jest.fn(),
    syncStepMessage: jest.fn(),
    clearStepMaps: jest.fn(),
    messageHandler: jest.fn(),
    setIsSubmitting: jest.fn(),
    setShowStopButton: jest.fn(),
  })),
);

const mockRefreshTenantBearer = jest.fn();
const mockRequireLogin = jest.fn();
jest.mock('~/utils/login', () => ({
  refreshTenantBearer: () => mockRefreshTenantBearer(),
  requireLogin: (reason: string) => mockRequireLogin(reason),
  LOGIN_REQUIRED: 'loginRequired',
}));

const mockRefreshToken = jest.fn();
jest.mock('@hanzochat/data-provider', () => {
  const actual = jest.requireActual('@hanzochat/data-provider');
  return {
    ...actual,
    createPayload: jest.fn(() => ({
      payload: { model: 'zen5-flash' },
      server: '/v1/chat/agents/chat/Hanzo',
    })),
    removeNullishValues: jest.fn((v: unknown) => v),
    request: {
      refreshToken: () => mockRefreshToken(),
      dispatchTokenUpdatedEvent: jest.fn(),
    },
  };
});

import useSSE from '~/hooks/SSE/useSSE';

const submission = {
  conversation: { conversationId: 'conv-1' },
  userMessage: { messageId: 'm1', conversationId: 'conv-1', text: 'hi' },
  messages: [],
  isRegenerate: false,
  initialResponse: { messageId: 'm2', conversationId: 'conv-1', text: '' },
} as unknown as TSubmission;

const chatHelpers = {
  setMessages: jest.fn(),
  getMessages: jest.fn(() => []),
  setConversation: jest.fn(),
  setIsSubmitting: jest.fn(),
  newConversation: jest.fn(),
  resetLatestMessage: jest.fn(),
};

const lastSSE = () => mockSSEInstances[mockSSEInstances.length - 1];

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useSSE — the stale forwarded bearer arrives as 403', () => {
  beforeEach(() => {
    mockSSEInstances.length = 0;
    jest.clearAllMocks();
  });

  it('re-mints the tenant bearer on 403 and retries, without asking anyone to sign in', async () => {
    mockRefreshTenantBearer.mockResolvedValue('fresh-iam-bearer');
    renderHook(() => useSSE(submission, chatHelpers));

    const sse = lastSSE();
    const streamsBefore = sse.stream.mock.calls.length;
    sse._emit('error', { responseCode: 403, data: '{}' });
    await flush();

    expect(mockRefreshTenantBearer).toHaveBeenCalledTimes(1);
    expect(sse.headers.Authorization).toBe('Bearer fresh-iam-bearer');
    expect(sse.stream.mock.calls.length).toBe(streamsBefore + 1);
    /* The whole point: no login gate and no error surfaced to the message list. */
    expect(mockRequireLogin).not.toHaveBeenCalled();
    expect(mockErrorHandler).not.toHaveBeenCalled();
    /* A 403 must NOT renew chat's own JWT — that is the wrong credential. */
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it('surfaces the error when there is genuinely nothing to re-mint', async () => {
    mockRefreshTenantBearer.mockResolvedValue('');
    renderHook(() => useSSE(submission, chatHelpers));

    lastSSE()._emit('error', { responseCode: 403, data: '{}' });
    await flush();

    expect(mockRefreshTenantBearer).toHaveBeenCalledTimes(1);
    expect(mockErrorHandler).toHaveBeenCalled();
  });

  it('re-mints at most once per stream, so a refused retry cannot loop', async () => {
    mockRefreshTenantBearer.mockResolvedValue('fresh-iam-bearer');
    renderHook(() => useSSE(submission, chatHelpers));

    const sse = lastSSE();
    sse._emit('error', { responseCode: 403, data: '{}' });
    await flush();
    sse._emit('error', { responseCode: 403, data: '{}' });
    await flush();

    expect(mockRefreshTenantBearer).toHaveBeenCalledTimes(1);
    expect(mockErrorHandler).toHaveBeenCalled();
  });
});
