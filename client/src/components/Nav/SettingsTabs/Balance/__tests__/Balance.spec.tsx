import React from 'react';
import { render, screen } from '@testing-library/react';
import Balance from '../Balance';

/**
 * The one invariant this file exists to hold: a balance that could NOT be read is
 * not a balance of zero.
 *
 * Every field in Balance destructures out of `balanceData ?? {}` with a `= 0`
 * default, so before this was fixed a 401/403 or a dropped request rendered a
 * confident "$0.00 / 0 tokens remaining" — pixel-identical to a genuinely empty
 * account. That is the number a customer checks before topping up, and it read
 * broke to precisely the people whose credential had lapsed.
 */

const mockBalanceQuery = jest.fn();

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { balance: { enabled: true } } }),
  useGetUserBalance: () => mockBalanceQuery(),
}));

jest.mock('~/hooks', () => ({
  useAuthContext: () => ({ isAuthenticated: true }),
  useLocalize: () => (key: string) => key,
}));

jest.mock('../TokenCreditsItem', () => ({
  __esModule: true,
  default: ({ tokenCredits }: { tokenCredits: number }) => (
    <div data-testid="token-credits">{tokenCredits}</div>
  ),
}));

jest.mock('../AutoRefillSettings', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Balance — a failed read is not zero', () => {
  afterEach(() => jest.clearAllMocks());

  it('does not render $0.00 when the read FAILED', () => {
    mockBalanceQuery.mockReturnValue({ data: undefined, isError: true, isLoading: false });
    render(<Balance />);

    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Balance unavailable/i)).toBeInTheDocument();
    /* No fabricated breakdown drawn from an answer that never landed. */
    expect(screen.queryByTestId('token-credits')).not.toBeInTheDocument();
    expect(screen.queryByText(/tokens remaining/i)).not.toBeInTheDocument();
  });

  it('does not render $0.00 while the read is still IN FLIGHT', () => {
    mockBalanceQuery.mockReturnValue({ data: undefined, isError: false, isLoading: true });
    render(<Balance />);

    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Checking balance/i)).toBeInTheDocument();
  });

  it('DOES render $0.00 for a successful read of a genuinely empty account', () => {
    mockBalanceQuery.mockReturnValue({
      data: { tokenCredits: 0 },
      isError: false,
      isLoading: false,
    });
    render(<Balance />);

    /* The negative control: a real zero must still read as zero, or this fix
       would have traded one lie for another. */
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.getByText(/0 tokens remaining/i)).toBeInTheDocument();
  });

  it('renders a real non-zero balance', () => {
    mockBalanceQuery.mockReturnValue({
      data: { tokenCredits: 12_500_000 },
      isError: false,
      isLoading: false,
    });
    render(<Balance />);

    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});
