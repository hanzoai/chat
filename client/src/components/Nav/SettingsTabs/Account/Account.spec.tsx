import React from 'react';
import { render, screen } from '@testing-library/react';
import Account from './Account';

jest.mock('./DisplayUsernameMessages', () => () => <div data-testid="display-username" />);
jest.mock('./Avatar', () => () => <div data-testid="avatar" />);
jest.mock('./DeleteAccount', () => () => <div data-testid="delete-account" />);

describe('Account', () => {
  it('renders the username, avatar and delete-account sections', () => {
    render(<Account />);

    expect(screen.getByTestId('display-username')).toBeInTheDocument();
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });
});
