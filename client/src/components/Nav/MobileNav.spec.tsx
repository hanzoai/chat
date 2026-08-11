import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The phone's top bar, kept to what a thumb needs.
 *
 * Left is ONE control: the Hanzo mark, which opens the drawer on tap and swaps
 * to the sidebar-expand glyph on hover. It replaced the old hamburger-beside-the-
 * mark pair — two affordances for one idea — so the mark now lives INSIDE the
 * menu button rather than in a separate app-launcher.
 *
 * Right, signed in, is the one control the phone keeps up here: temporary
 * ("incognito") chat. Signed out it is the two ways in. The signed-in half is
 * asserted here because a headless browser cannot reach it — signing in needs a
 * real hanzo.id session.
 */

let mockAuthenticated = false;
const mockLogin = jest.fn();

jest.mock('@hanzogui/shell', () => ({
  HanzoMark: () => <div data-testid="mark" />,
}));
jest.mock('lucide-react', () => ({
  PanelLeft: () => <div data-testid="panel-left" />,
}));
jest.mock('~/components/Chat/TemporaryChat', () => ({
  TemporaryChat: () => <button type="button" aria-label="com_ui_temporary" />,
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ isAuthenticated: mockAuthenticated }),
}));

jest.mock('~/utils/login', () => ({ startHanzoLogin: () => mockLogin() }));
jest.mock('jotai', () => ({ useAtomValue: () => ({ title: 'A thread' }) }));
jest.mock('~/store', () => ({ __esModule: true, default: { conversationByIndex: () => ({}) } }));

import MobileNav from './MobileNav';

const mount = () => render(<MobileNav navVisible={false} setNavVisible={jest.fn()} />);

describe('the phone bar, signed out', () => {
  beforeEach(() => {
    mockAuthenticated = false;
    jest.clearAllMocks();
    mount();
  });

  it('is the mark-as-drawer-toggle and the two ways in, and nothing else', () => {
    expect(screen.getByRole('button', { name: 'com_nav_open_sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_log_in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' })).toBeInTheDocument();
    expect(screen.queryByText('A thread')).not.toBeInTheDocument();
    // The mark no longer sits in its own app-launcher button.
    expect(screen.queryByRole('button', { name: 'com_nav_hanzo_apps' })).not.toBeInTheDocument();
  });

  it('makes the mark the drawer toggle — the mark AND the expand glyph live inside the menu button', () => {
    const menu = screen.getByRole('button', { name: 'com_nav_open_sidebar' });
    expect(menu).toContainElement(screen.getByTestId('mark'));
    expect(menu).toContainElement(screen.getByTestId('panel-left'));
  });

  it('names the drawer it controls', () => {
    const menu = screen.getByRole('button', { name: 'com_nav_open_sidebar' });
    expect(menu).toHaveAttribute('aria-controls', 'chat-history-nav');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * Sign-up leaves for hanzo.id. Chat implements no account creation of its own
   * and must not grow one — a local `/signup` route here would be exactly that.
   */
  it('sends sign-up to hanzo.id, not to a route of its own', () => {
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' })).toHaveAttribute(
      'href',
      'https://hanzo.id/signup/hanzo-chat',
    );
  });

  it('starts the one login path', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'com_nav_log_in' }));
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});

describe('the phone bar, signed in', () => {
  beforeEach(() => {
    mockAuthenticated = true;
    jest.clearAllMocks();
    mount();
  });

  it('keeps the mark corner, titles the conversation, and adds temporary chat', () => {
    expect(screen.getByRole('button', { name: 'com_nav_open_sidebar' })).toBeInTheDocument();
    expect(screen.getByTestId('mark')).toBeInTheDocument();
    expect(screen.getByText('A thread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_temporary' })).toBeInTheDocument();
  });

  it('drops the arrival controls', () => {
    expect(screen.queryByRole('button', { name: 'com_nav_log_in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'com_auth_sign_up' })).not.toBeInTheDocument();
  });
});
