/**
 * @jest-environment jsdom
 */
import axios from 'axios';

/**
 * The 401 interceptor queues every request that arrives while a refresh is in
 * flight. Whatever the refresh outcome, the queue must be drained exactly once —
 * an unanswered queue entry is a promise that never settles, i.e. a request that
 * hangs forever instead of surfacing its 401 (which is what the login gate
 * listens for).
 */
describe('request interceptor: a refresh that mints no token', () => {
  const originalHref = window.location.href;

  beforeAll(() => {
    // The module installs the interceptor on import, guarded by `window`.
    require('./request');
  });

  beforeEach(() => {
    axios.defaults.headers.common['Authorization'] = 'Bearer header.eyJndWVzdCI6dHJ1ZX0.sig';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete axios.defaults.headers.common['Authorization'];
    window.history.replaceState({}, '', originalHref);
  });

  const unauthorized = (url: string) => ({
    config: { url, headers: {} as Record<string, string> },
    response: { status: 401, data: 'Unauthorized' },
    isAxiosError: true,
  });

  /** Drive the interceptor's error handler directly with two concurrent 401s. */
  const rejectionHandler = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (axios.interceptors.response as any).handlers as Array<{
      rejected?: (e: unknown) => Promise<unknown>;
    }>;
    const handler = handlers.filter((h) => typeof h.rejected === 'function').pop();
    if (!handler?.rejected) {
      throw new Error('no response rejection interceptor installed');
    }
    return handler.rejected;
  };

  it('rejects the queued request with the 401 instead of leaving it pending', async () => {
    // The refresh answers 200 with no token — the real shape when an anonymous
    // visitor has no refresh cookie.
    jest.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const rejected = rejectionHandler();

    const first = rejected(unauthorized('/v1/chat/files/config')).catch((e) => e);
    const queued = rejected(unauthorized('/v1/chat/agents/chat/Hanzo')).catch((e) => e);

    const settled = await Promise.race([
      Promise.all([first, queued]),
      new Promise((resolve) => setTimeout(() => resolve('PENDING'), 500)),
    ]);

    expect(settled).not.toBe('PENDING');
    const [, queuedError] = settled as Array<{ response?: { status?: number } }>;
    expect(queuedError?.response?.status).toBe(401);
  });
});
