import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsProvider from './AnalyticsProvider';

/* The provider reads the live session from AuthContext and nothing else. */
const mockAuth = {
  token: 'session' as string | undefined,
  user: undefined as { id: string } | undefined,
  isAuthenticated: false,
};
jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => mockAuth,
}));

/** The client batches; this is the 5s flush interval it batches for. */
const FLUSH_MS = 5000;

type Body = { batch: Array<Record<string, unknown>> };

describe('AnalyticsProvider', () => {
  let fetchMock: jest.Mock;

  /** Every event the provider emitted, in order, as the door received them. */
  const sent = (): Array<Record<string, unknown>> =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse(init.body as string) as Body).batch);

  const flush = () =>
    act(() => {
      jest.advanceTimersByTime(FLUSH_MS);
    });

  const mount = (path = '/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AnalyticsProvider>
          <div>chat</div>
        </AnalyticsProvider>
      </MemoryRouter>,
    );

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    mockAuth.token = 'session';
    mockAuth.user = undefined;
    mockAuth.isAuthenticated = false;
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders its children — it needs no provider of its own', () => {
    mount();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('posts a pageview for the router path to the ONE front door', () => {
    mount('/c/new');
    flush();

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.hanzo.ai/v1/event');
    expect(sent().find((e) => e.type === 'pageview')).toMatchObject({
      type: 'pageview',
      event: '$pageview',
      path: '/c/new',
      product: 'chat',
    });
  });

  it('identifies the authenticated user by stable id, never by PII', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'user_42' };
    mount();
    flush();

    const identify = sent().find((e) => e.type === 'identify');
    expect(identify).toMatchObject({ type: 'identify', distinctId: 'user_42', personId: 'user_42' });
    // The id and nothing else — no traits, so no route for email/PII to ride along.
    expect(identify).not.toHaveProperty('properties');
  });

  it('captures an unhandled error onto the same stream, with no app code', () => {
    mount();

    const event = new Event('error') as Event & { error?: Error };
    event.error = new Error('boom');
    act(() => {
      window.dispatchEvent(event);
    });
    flush();

    expect(sent().find((e) => e.type === 'error')).toMatchObject({
      type: 'error',
      event: 'boom',
      product: 'chat',
      error: { type: 'Error', message: 'boom', handled: false },
    });
  });

  it('sends nothing at all when the browser refuses tracking (GPC)', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    try {
      mount('/c/new');
      flush();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: undefined,
        configurable: true,
      });
    }
  });
});
