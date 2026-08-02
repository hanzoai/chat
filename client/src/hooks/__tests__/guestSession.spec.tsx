import { render, act, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContextProvider, useAuthContext } from '../AuthContext';
import { LOGIN_REQUIRED } from '~/utils/login';

/**
 * A guest is the FALLBACK identity for a visitor the session probe found to have
 * no session. Minting one while the probe is still in flight puts the guest
 * bearer on top of the real one, and the signed-in session then reads the
 * guest's capped catalog (one model, `GUEST_MODEL`) as if it were its own.
 */

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockSetTokenHeader = jest.fn();
jest.mock('@hanzochat/data-provider', () => ({
  ...jest.requireActual('@hanzochat/data-provider'),
  setTokenHeader: (token?: string) => mockSetTokenHeader(token),
}));

/** Resolves the session probe on the test's command. */
let probe: { onSuccess: (data?: unknown) => void; onError: (error: unknown) => void };
const mockRefreshMutate = jest.fn((_vars, options) => {
  probe = options;
});

const mockAcquireGuestToken = jest.fn(async () => ({
  token: 'guest-token',
  user: { id: 'guest', role: 'GUEST' },
  model: 'zen5-flash',
  endpoint: 'Hanzo',
}));

jest.mock('~/data-provider', () => ({
  useLoginUserMutation: () => ({ mutate: jest.fn() }),
  useLogoutUserMutation: () => ({ mutate: jest.fn() }),
  useRefreshTokenMutation: () => ({ mutate: mockRefreshMutate }),
  useGetUserQuery: () => ({ data: undefined, isError: false, error: null }),
  useGetRole: () => ({ data: null }),
  useGetStartupConfig: () => ({ data: { allowGuestChat: true } }),
}));

jest.mock('../useGuestAuth', () => ({
  __esModule: true,
  default: () => ({ acquireGuestToken: mockAcquireGuestToken }),
}));

function Consumer() {
  const { isAuthenticated, isGuest } = useAuthContext();
  return <div data-testid="c" data-live={`${isAuthenticated}`} data-guest={`${isGuest}`} />;
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider>
        <MemoryRouter>
          <AuthContextProvider authConfig={{ loginRedirect: '/login' }}>
            <Consumer />
          </AuthContextProvider>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

describe('guest is the fallback identity, never an overlay on a session', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not mint a guest while the session probe is still in flight', () => {
    renderProvider();

    expect(mockRefreshMutate).toHaveBeenCalled();
    expect(mockAcquireGuestToken).not.toHaveBeenCalled();
  });

  it('never mints a guest for a visitor the probe found signed in', async () => {
    const { getByTestId } = renderProvider();

    await act(async () => {
      probe.onSuccess({ token: 'chat-jwt', user: { id: 'u', role: 'USER' } });
    });

    await waitFor(() => expect(getByTestId('c').dataset.live).toBe('true'));
    expect(getByTestId('c').dataset.guest).toBe('false');
    expect(mockAcquireGuestToken).not.toHaveBeenCalled();
    expect(mockSetTokenHeader).toHaveBeenLastCalledWith('chat-jwt');
  });

  it('mints a guest once the probe reports no session', async () => {
    const { getByTestId } = renderProvider();

    await act(async () => {
      probe.onSuccess({});
    });

    await waitFor(() => expect(mockAcquireGuestToken).toHaveBeenCalled());
    await waitFor(() => expect(getByTestId('c').dataset.guest).toBe('true'));
    expect(mockSetTokenHeader).toHaveBeenLastCalledWith('guest-token');
  });

  /**
   * A refused mint (429 on the per-IP limiter) used to pass in total silence:
   * `Root` fell through to the marketing page, so the visitor got a site with no
   * composer and no explanation. The refusal now opens the ONE gate built for a
   * not-signed-in outcome, carrying the reason.
   */
  it('says so when the guest mint is refused, instead of failing silently', async () => {
    mockAcquireGuestToken.mockResolvedValueOnce(null as never);
    const reasons: string[] = [];
    const listen = (e: Event) =>
      reasons.push((e as CustomEvent<{ reason: string }>).detail?.reason);
    window.addEventListener(LOGIN_REQUIRED, listen);

    const { getByTestId } = renderProvider();
    await act(async () => {
      probe.onSuccess({});
    });

    await waitFor(() => expect(reasons).toContain('unavailable'));
    expect(getByTestId('c').dataset.guest).toBe('false');
    window.removeEventListener(LOGIN_REQUIRED, listen);
  });

  it('does not cry refusal when a real session simply won the race', async () => {
    let releaseGuest: (value: unknown) => void = () => {};
    mockAcquireGuestToken.mockImplementationOnce(
      () => new Promise((resolve) => (releaseGuest = resolve)) as never,
    );
    const reasons: string[] = [];
    const listen = (e: Event) =>
      reasons.push((e as CustomEvent<{ reason: string }>).detail?.reason);
    window.addEventListener(LOGIN_REQUIRED, listen);

    const { getByTestId } = renderProvider();
    await act(async () => {
      probe.onSuccess({});
    });
    await waitFor(() => expect(mockAcquireGuestToken).toHaveBeenCalled());
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: 'chat-jwt' }));
    });
    await waitFor(() => expect(getByTestId('c').dataset.live).toBe('true'));
    await act(async () => {
      releaseGuest(null);
    });

    expect(reasons).not.toContain('unavailable');
    window.removeEventListener(LOGIN_REQUIRED, listen);
  });

  it('drops a guest token that arrives after a real session', async () => {
    let releaseGuest: (value: unknown) => void = () => {};
    mockAcquireGuestToken.mockImplementationOnce(
      () => new Promise((resolve) => (releaseGuest = resolve)) as never,
    );

    const { getByTestId } = renderProvider();

    await act(async () => {
      probe.onSuccess({});
    });
    await waitFor(() => expect(mockAcquireGuestToken).toHaveBeenCalled());

    /* The real session lands while the guest token is still in flight. */
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: 'chat-jwt' }));
    });
    await waitFor(() => expect(getByTestId('c').dataset.live).toBe('true'));

    await act(async () => {
      releaseGuest({
        token: 'guest-token',
        user: { id: 'guest', role: 'GUEST' },
        model: 'zen5-flash',
        endpoint: 'Hanzo',
      });
    });

    expect(getByTestId('c').dataset.guest).toBe('false');
    expect(mockSetTokenHeader).not.toHaveBeenCalledWith('guest-token');
  });
});
