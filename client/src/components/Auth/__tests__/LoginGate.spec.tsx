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

import { LOGIN_REQUIRED, requireLogin, takePendingLogin } from '~/utils/login';
import LoginGate from '../LoginGate';

describe('LoginGate', () => {
  beforeEach(() => {
    mockStartHanzoLogin.mockClear();
    takePendingLogin();
  });

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

  it('explains a refused guest mint rather than leaving the visitor guessing', () => {
    render(<LoginGate />);

    act(() => requireLogin('unavailable'));

    expect(screen.getByText('com_auth_login_unavailable_title')).toBeInTheDocument();
    expect(screen.getByText('com_auth_login_unavailable_message')).toBeInTheDocument();
  });

  /**
   * Auth resolves before the shell paints — a refused mint answers while `Root` is
   * still showing its spinner — so a refusal dispatched then reached no listener
   * at all and the visitor got a composer-less page with no error.
   */
  it('shows a refusal that landed before it mounted', () => {
    act(() => requireLogin('unavailable'));

    render(<LoginGate />);

    expect(screen.getByText('com_auth_login_unavailable_title')).toBeInTheDocument();
  });

  it('does not re-open a dismissed gate when it remounts', () => {
    act(() => requireLogin('unavailable'));
    const { unmount } = render(<LoginGate />);
    unmount();

    render(<LoginGate />);

    expect(screen.queryByText('com_auth_login_unavailable_title')).not.toBeInTheDocument();
  });

  it('starts the Hanzo IAM login from the gate button', async () => {
    render(<LoginGate />);

    act(() => requireLogin('anonymous'));
    await userEvent.click(screen.getByRole('button', { name: 'com_auth_login_button' }));

    expect(mockStartHanzoLogin).toHaveBeenCalled();
  });

  it('offers the plans to a visitor who spent the preview', () => {
    render(<LoginGate />);

    act(() => requireLogin('limit'));

    expect(screen.getByRole('link', { name: 'com_auth_login_plans' })).toHaveAttribute(
      'href',
      'https://hanzo.ai/pricing',
    );
  });

  /** Someone who never got a reply has no way to judge a plan, so is not asked. */
  it('does not offer the plans before the product has answered', () => {
    render(<LoginGate />);

    act(() => requireLogin('anonymous'));

    expect(screen.queryByRole('link', { name: 'com_auth_login_plans' })).not.toBeInTheDocument();
  });
});
