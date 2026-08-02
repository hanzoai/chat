import { renderHook } from '@testing-library/react';

/**
 * Minting a guest token is how the landing renders at all, and the client used to
 * throw the token away on every page load and mint a fresh one. So the per-IP
 * mint limiter (`guestTokenLimiter`) was counting PAGE VIEWS, and a handful of
 * reloads answered 429 — which downgraded the whole product to a marketing page.
 *
 * The token carries its own lifetime. Reusing it makes that limiter measure
 * mint-spam again, which is the only thing it was ever for.
 */

const mockGetGuestToken = jest.fn();
jest.mock('@hanzochat/data-provider', () => ({
  ...jest.requireActual('@hanzochat/data-provider'),
  dataService: { getGuestToken: () => mockGetGuestToken() },
}));

import useGuestAuth from '../useGuestAuth';

const minted = (token = 'guest-token', expiresIn = 3600) => ({
  token,
  expiresIn,
  endpoint: 'Hanzo',
  model: 'zen5-flash',
  messageMax: 2,
});

const acquire = () => renderHook(() => useGuestAuth()).result.current.acquireGuestToken();

describe('useGuestAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockGetGuestToken.mockReset();
  });

  it('mints once and reuses the bearer across page loads', async () => {
    mockGetGuestToken.mockResolvedValue(minted());

    const first = await acquire();
    const second = await acquire();

    expect(mockGetGuestToken).toHaveBeenCalledTimes(1);
    expect(second?.token).toBe(first?.token);
    expect(second?.model).toBe('zen5-flash');
    expect(second?.endpoint).toBe('Hanzo');
  });

  it('mints again once the stored bearer has expired', async () => {
    mockGetGuestToken.mockResolvedValueOnce(minted('first', 1));
    await acquire();

    /* Past the token's own lifetime — reusing it would send a dead bearer. */
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3_600_000);
    mockGetGuestToken.mockResolvedValueOnce(minted('second'));
    const second = await acquire();

    expect(mockGetGuestToken).toHaveBeenCalledTimes(2);
    expect(second?.token).toBe('second');
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('keeps the bearer out of localStorage — it must not outlive the visit', async () => {
    mockGetGuestToken.mockResolvedValue(minted());

    await acquire();

    expect(JSON.stringify(localStorage)).not.toContain('guest-token');
    expect(JSON.stringify(sessionStorage)).toContain('guest-token');
  });

  it('reports a refused mint instead of pretending it has a session', async () => {
    mockGetGuestToken.mockRejectedValue(
      Object.assign(new Error('429'), { response: { status: 429 } }),
    );

    await expect(acquire()).resolves.toBeNull();
  });

  it('does not cache a refusal — the next visit may well succeed', async () => {
    mockGetGuestToken.mockRejectedValueOnce(new Error('429'));
    await acquire();

    mockGetGuestToken.mockResolvedValueOnce(minted());
    await expect(acquire()).resolves.toMatchObject({ token: 'guest-token' });
  });
});
