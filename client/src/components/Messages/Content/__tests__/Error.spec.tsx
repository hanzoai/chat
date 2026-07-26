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

  it('still reports an unrecognized error verbatim', () => {
    render(<Error text="upstream exploded" />);

    expect(screen.getByText(/Something went wrong.*upstream exploded/)).toBeInTheDocument();
  });
});
