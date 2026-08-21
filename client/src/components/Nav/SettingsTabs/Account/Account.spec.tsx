import React from 'react';
import { render, screen } from '@testing-library/react';
import Account from './Account';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('./DisplayUsernameMessages', () => () => <div data-testid="display-username" />);
jest.mock('./Avatar', () => () => <div data-testid="avatar" />);
jest.mock('./DeleteAccount', () => () => <div data-testid="delete-account" />);
jest.mock('./SharedLinks', () => () => <div data-testid="shared-links" />);
jest.mock('./ImportConversations', () => () => <div data-testid="import-conversations" />);

describe('Account', () => {
  it('carries who you are, what is yours, and the ways out', () => {
    render(<Account />);

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByTestId('display-username')).toBeInTheDocument();
    expect(screen.getByTestId('signature-input')).toBeInTheDocument();
    expect(screen.getByTestId('shared-links')).toBeInTheDocument();
    expect(screen.getByTestId('import-conversations')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });

  /** The balance dashboard became a link out. If it ever grows back into a
   *  ledger rendered here, two places will be reporting one number. */
  it('sends billing to billing.hanzo.ai rather than rendering a ledger', () => {
    render(<Account />);

    expect(screen.getByRole('link', { name: /com_ui_manage/ })).toHaveAttribute(
      'href',
      'https://billing.hanzo.ai',
    );
  });
});
