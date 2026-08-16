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

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  /* The sign-up address as the hook resolves it: this deployment's issuer, and
     the authorize request that brings the new account back here with a code. */
  useSignupUrl: () =>
    mockOrg === 'hanzo'
      ? 'https://hanzo.id/signup/hanzo-chat?client_id=hanzo-chat&redirect_uri=https%3A%2F%2Fhanzo.chat%2Fauth%2Fcallback&state=s&code_challenge=c'
      : `https://${mockOrg}.id/signup/${mockOrg}-chat?client_id=${mockOrg}-chat&state=s&code_challenge=c`,
}));
jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { helpAndFaqURL: 'https://docs.hanzo.ai' } }),
}));
jest.mock('~/utils/login', () => ({ startHanzoLogin: () => mockLogin() }));
/* The brand this deployment serves. A getter rather than a literal because the
   value is read at RENDER time, so one mock can answer for both tenants. */
let mockOrg = 'hanzo';
jest.mock('~/utils/iam', () => ({
  get IAM_ORG() {
    return mockOrg;
  },
}));
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
    mockOrg = 'hanzo';
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
    const href = screen.getByRole('link', { name: 'com_auth_sign_up' }).getAttribute('href') ?? '';
    expect(href).toContain('https://hanzo.id/signup/hanzo-chat');
    /* Carrying this app's own authorize request is what makes the account
       usable the moment it exists: the issuer answers registration with a code
       on chat's callback, so there is no second trip to sign in. */
    expect(href).toContain('redirect_uri=https%3A%2F%2Fhanzo.chat%2Fauth%2Fcallback');
    expect(href).toContain('code_challenge=');
  });

  /**
   * Log in above, sign-up last against the foot of the column. Which of the two
   * comes first is the whole of this control's design and nothing else in the
   * file decides it, so it is asserted rather than left to whoever edits the JSX
   * next. `compareDocumentPosition` reads the rendered document, so it holds
   * however the two end up laid out.
   */
  it('puts log in above sign-up', () => {
    const login = screen.getByRole('button', { name: 'com_nav_log_in' });
    const signup = screen.getByRole('link', { name: 'com_auth_sign_up' });
    expect(login.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/**
 * One image serves every brand, so every row in this foot has to be a row THIS
 * tenant can use. "Plans" was the one that was not: it opened hanzo.ai/pricing —
 * another company's prices, for a product the visitor is buying from Lux.
 */
describe('the sidebar foot on another tenant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrg = 'lux';
    render(<Visitor />);
  });

  it("offers no row that sells another brand's plans", () => {
    expect(screen.queryByRole('link', { name: 'com_nav_plans' })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('hanzo.ai/pricing');
  });

  /* Hiding the wrong row must not take the working ones with it. */
  it('keeps settings, help and the login path', () => {
    expect(screen.getByRole('button', { name: 'com_nav_settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'com_nav_help' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_nav_log_in' })).toBeInTheDocument();
  });

  it("sends sign-up to this tenant's issuer", () => {
    expect(screen.getByRole('link', { name: 'com_auth_sign_up' }).getAttribute('href')).toContain(
      'https://lux.id/signup/lux-chat',
    );
  });
});
