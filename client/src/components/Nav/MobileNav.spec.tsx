import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The phone's top bar owns the app's top-left corner on this width.
 *
 * Both auth states anchor the left with the same two controls, because they mean
 * the same thing in both: the menu button opens the drawer, and the mark is the
 * app switcher — the same `BrandCorner` as everywhere else, one tap from
 * anywhere. The mark used to BE the drawer toggle when signed out, which left
 * the switcher reachable only through the drawer (its only button sat off-canvas
 * at x=-310 on a 390px viewport) and gave the brand glyph a second meaning.
 *
 * Signed in the bar adds the conversation title and compose; signed out it adds
 * the two ways in. The signed-in half is asserted here because the headless
 * browser cannot reach it — signing in needs a real hanzo.id session.
 */

let mockAuthenticated = false;
const mockLogin = jest.fn();
const mockNewConversation = jest.fn();

jest.mock('@hanzogui/shell', () => ({
  HanzoMark: () => <div data-testid="mark" />,
  HanzoAppLauncher: ({
    label,
    trigger,
  }: {
    label: string;
    trigger: () => React.ReactNode;
  }) => (
    <button type="button" aria-label={label}>
      {trigger()}
    </button>
  ),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useNewConvo: () => ({ newConversation: mockNewConversation }),
  useAuthContext: () => ({ isAuthenticated: mockAuthenticated }),
}));

jest.mock('~/utils/login', () => ({ startHanzoLogin: () => mockLogin() }));
jest.mock('~/utils', () => ({ clearMessagesCache: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@hanzochat/data-provider', () => ({ QueryKeys: { messages: 'messages' } }));
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

  it('is the menu, the mark and the two ways in, and nothing else', () => {
    expect(screen.getByRole('button', { name: 'com_nav_open_sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_hanzo_apps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_log_in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' })).toBeInTheDocument();
    expect(screen.queryByText('A thread')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'com_ui_new_chat' })).not.toBeInTheDocument();
  });

  it('makes the mark the switcher, not the drawer toggle', () => {
    const launcher = screen.getByRole('button', { name: 'com_nav_hanzo_apps' });
    expect(launcher).toContainElement(screen.getByTestId('mark'));
    expect(screen.getByRole('button', { name: 'com_nav_open_sidebar' })).not.toContainElement(
      screen.getByTestId('mark'),
    );
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

  it('keeps the same corner and adds the conversation', () => {
    expect(screen.getByRole('button', { name: 'com_nav_open_sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_hanzo_apps' })).toBeInTheDocument();
    expect(screen.getByText('A thread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_new_chat' })).toBeInTheDocument();
  });

  it('drops the arrival controls', () => {
    expect(screen.queryByRole('button', { name: 'com_nav_log_in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'com_auth_sign_up' })).not.toBeInTheDocument();
  });
});
