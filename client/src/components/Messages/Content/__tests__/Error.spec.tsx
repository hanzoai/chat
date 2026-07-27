import { render, screen } from '@testing-library/react';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

/** Only the error copy is under test; CodeBlock drags in the whole editor tree. */
jest.mock('../CodeBlock', () => ({
  __esModule: true,
  default: () => null,
}));

import Error from '../Error';

describe('Error message content', () => {
  it('says the visitor is not signed in for a bare Unauthorized body', () => {
    render(<Error text={'"Unauthorized"'} />);

    expect(screen.getByText('com_error_unauthorized')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
  });

  it('says the same for an unquoted Unauthorized body', () => {
    render(<Error text="Unauthorized" />);

    expect(screen.getByText('com_error_unauthorized')).toBeInTheDocument();
  });

  it('says the same for a JSON Unauthorized body', () => {
    render(<Error text={JSON.stringify({ message: 'Unauthorized' })} />);

    expect(screen.getByText('com_error_unauthorized')).toBeInTheDocument();
  });

  /**
   * This used to assert the opposite — that an unrecognised error was reported
   * VERBATIM. That contract is what leaked twice: Passport's bare `Unauthorized`
   * and then a gateway `402 a billable tenant is required (no anonymous usage)`,
   * each printed to a stranger as "the specific error message we encountered".
   * The mapping above still handles the shapes that genuinely say something
   * different; the fallback no longer echoes upstream.
   */
  it('renders a human sentence for an unrecognized error, never the upstream body', () => {
    render(<Error text="upstream exploded" />);

    expect(screen.queryByText(/upstream exploded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/specific error message/)).not.toBeInTheDocument();
    expect(screen.getByText('com_error_unknown')).toBeInTheDocument();
  });

  it('does not echo an unmapped gateway 402 — the shape that reached production', () => {
    // No `type`, no `code`: exactly the body the login gate did not recognise.
    render(<Error text={JSON.stringify({ message: '402 a billable tenant is required (no anonymous usage)' })} />);

    expect(screen.queryByText(/billable tenant/)).not.toBeInTheDocument();
    expect(screen.queryByText(/402/)).not.toBeInTheDocument();
    expect(screen.getByText('com_error_unknown')).toBeInTheDocument();
  });
});
