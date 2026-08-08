import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The sidebar's foot for a visitor with no session.
 *
 * Signed out, the account menu that used to sit here had exactly one usable row.
 * Everything an arriving visitor might want first — what it costs, the theme,
 * the docs — was inside a dropdown that only opened for people who already had
 * an account. These four are the rows that replaced it.
 */

const mockLogin = jest.fn();

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { helpAndFaqURL: 'https://docs.hanzo.ai' } }),
}));
jest.mock('~/utils/login', () => ({ startHanzoLogin: () => mockLogin() }));
jest.mock('./Settings', () => ({ __esModule: true, default: () => <div data-testid="settings" /> }));
jest.mock('@hanzochat/client', () => ({
  GearIcon: () => <span />,
  Button: ({ children, ...p }: React.ComponentProps<'button'>) => <button {...p}>{children}</button>,
}));
jest.mock('lucide-react', () => ({ CreditCard: () => <span />, CircleHelp: () => <span /> }));

import Visitor from './Visitor';

describe('the sidebar foot, signed out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(<Visitor />);
  });

  it('offers plans, settings and help without a session', () => {
    expect(screen.getByRole('link', { name: 'com_nav_plans' })).toHaveAttribute(
      'href',
      'https://hanzo.ai/pricing',
    );
    expect(screen.getByRole('button', { name: 'com_nav_settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'com_nav_help' })).toHaveAttribute(
      'href',
      'https://docs.hanzo.ai',
    );
  });

  /**
   * The SAME settings modal the account menu opens, not a signed-out copy of it:
   * theme, language and the chat display preferences are local state and work
   * perfectly well without a session.
   */
  it('opens the one settings surface', async () => {
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'com_nav_settings' }));
    expect(screen.getByTestId('settings')).toBeInTheDocument();
  });

  it('starts the one login path', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'com_nav_log_in' }));
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  /**
   * Sign-up is a real second destination — hanzo.id serves the app-scoped form —
   * and chat implements no account creation of its own. A local route here would
   * be exactly the custom auth this codebase does not build.
   */
  it('sends sign-up to hanzo.id, not to a route of its own', () => {
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' })).toHaveAttribute(
      'href',
      'https://hanzo.id/signup/hanzo-chat',
    );
  });
});
