import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The phone's top bar is two different bars.
 *
 * Signed in it belongs to the open conversation — menu, title, compose. Signed
 * out there is no conversation to title and no history to open, so it is the
 * arrival bar: the mark, and the two ways in. It used to render the signed-in
 * one to everybody, which put "New Chat" above an empty thread for a visitor who
 * had not started one, and offered a compose button for a list they do not have.
 *
 * This is the pair the headless browser cannot reach — signing in needs a real
 * hanzo.id session — so the signed-in half is asserted here.
 */

let mockAuthenticated = false;
const mockLogin = jest.fn();
const mockNewConversation = jest.fn();

jest.mock('@hanzogui/shell', () => ({
  HanzoMark: () => <div data-testid="mark" />,
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

  it('is the mark and the two ways in, and nothing else', () => {
    expect(screen.getByTestId('mark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_log_in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' })).toBeInTheDocument();
    expect(screen.queryByText('A thread')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'com_ui_new_chat' })).not.toBeInTheDocument();
  });

  it('opens the menu from the mark', () => {
    const menu = screen.getByRole('button', { name: 'com_nav_open_sidebar' });
    expect(menu).toContainElement(screen.getByTestId('mark'));
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

  it('titles the open conversation and offers compose', () => {
    expect(screen.getByText('A thread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_new_chat' })).toBeInTheDocument();
  });

  it('drops the arrival controls', () => {
    expect(screen.queryByRole('button', { name: 'com_nav_log_in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'com_auth_sign_up' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('mark')).not.toBeInTheDocument();
  });
});
