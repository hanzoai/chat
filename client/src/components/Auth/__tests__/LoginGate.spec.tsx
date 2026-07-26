import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const mockStartHanzoLogin = jest.fn();
jest.mock('~/utils/login', () => ({
  ...jest.requireActual('~/utils/login'),
  startHanzoLogin: () => mockStartHanzoLogin(),
}));

import { LOGIN_REQUIRED, requireLogin } from '~/utils/login';
import LoginGate from '../LoginGate';

describe('LoginGate', () => {
  beforeEach(() => mockStartHanzoLogin.mockClear());

  it('stays closed until a request is refused', () => {
    render(<LoginGate />);

    expect(screen.queryByText('com_auth_login_anonymous_title')).not.toBeInTheDocument();
    expect(screen.queryByText('com_auth_login_limit_title')).not.toBeInTheDocument();
  });

  it('tells the visitor they are not signed in', () => {
    render(<LoginGate />);

    act(() => requireLogin('anonymous'));

    expect(screen.getByText('com_auth_login_anonymous_title')).toBeInTheDocument();
    expect(screen.getByText('com_auth_login_anonymous_message')).toBeInTheDocument();
  });

  it('reports the free preview limit when that is the reason', () => {
    render(<LoginGate />);

    act(() => requireLogin('limit'));

    expect(screen.getByText('com_auth_login_limit_title')).toBeInTheDocument();
  });

  it('defaults to the not-signed-in copy when no reason is carried', () => {
    render(<LoginGate />);

    act(() => {
      window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED));
    });

    expect(screen.getByText('com_auth_login_anonymous_title')).toBeInTheDocument();
  });

  it('starts the Hanzo IAM login from the gate button', async () => {
    render(<LoginGate />);

    act(() => requireLogin('anonymous'));
    await userEvent.click(screen.getByRole('button', { name: 'com_auth_login_button' }));

    expect(mockStartHanzoLogin).toHaveBeenCalled();
  });
});
