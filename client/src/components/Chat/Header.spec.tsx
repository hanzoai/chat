import { render, screen, within } from '@testing-library/react';
import Header from './Header';

/**
 * What the chat header carries, and what it must NOT.
 *
 * Every control that acts on the OPEN conversation belongs at the right end,
 * and there is one copy of each at every width — share and temporary-chat used
 * to be written twice under opposite `isSmallScreen` conditions, which is how
 * they drifted to opposite ends of the same header.
 *
 * The left edge is empty, and that is the contract this file exists to hold.
 * The mark, compose and the sidebar toggle appeared here while the sidebar was
 * collapsed, because collapsing slid the sidebar off screen and left its corner
 * empty. Collapsed it is now a rail that keeps them, so a copy here would be a
 * second set of the same three controls — the duplication the strip was
 * invented to avoid. The mocks below stay wired to the modules that would
 * render them, so re-adding any one of them fails these tests rather than
 * quietly restoring the duplicate.
 */

let mockSmallScreen = false;
let mockNavVisible = true;

jest.mock('@hanzochat/client', () => ({
  useMediaQuery: () => mockSmallScreen,
}));

jest.mock('react-router-dom', () => ({
  useOutletContext: () => ({ navVisible: mockNavVisible, setNavVisible: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

jest.mock('@hanzochat/data-provider', () => ({
  getConfigDefaults: () => ({ interface: { presets: true, modelSelect: true } }),
  PermissionTypes: { BOOKMARKS: 'BOOKMARKS', MULTI_CONVO: 'MULTI_CONVO' },
  Permissions: { USE: 'USE' },
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({
    data: { interface: { presets: true, modelSelect: true }, sharedLinksEnabled: true },
  }),
}));

jest.mock('~/hooks', () => ({
  useHasAccess: () => true,
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ isAuthenticated: true }),
}));
jest.mock('~/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' ') }));

// A function DECLARATION, not a const: the factories below run while `./Header`
// is being required on line 2, which is before a const in this scope is
// initialized. Declarations are hoisted; consts sit in the temporal dead zone.
function mockMarker(id: string) {
  return () => <div data-testid={id} />;
}

jest.mock('./Menus', () => ({
  PresetsMenu: mockMarker('presets'),
  HeaderNewChat: mockMarker('header-new-chat'),
  OpenSidebar: mockMarker('open-sidebar'),
}));
jest.mock('./Menus/Endpoints/ModelSelector', () => ({
  __esModule: true,
  default: mockMarker('model'),
}));
jest.mock('./Menus/BookmarkMenu', () => ({ __esModule: true, default: mockMarker('bookmarks') }));
jest.mock('./ExportAndShareMenu', () => ({ __esModule: true, default: mockMarker('share') }));
jest.mock('./TemporaryChat', () => ({ TemporaryChat: mockMarker('temporary') }));
jest.mock('./PanelControls', () => ({ __esModule: true, default: mockMarker('panel-controls') }));
jest.mock('~/components/Nav/BrandCorner', () => ({
  __esModule: true,
  default: mockMarker('brand'),
}));

// The header must read the same in every sidebar state — collapsed is the one
// the duplicate strip lived in, and the mocked outlet context is what puts the
// component in it, so a `navVisible`-conditional cluster coming back fails here.
// A phone with the sidebar OPEN is the list, not the conversation, so it would
// prove nothing about this header.
describe.each([
  ['desktop, sidebar open', false, true],
  ['desktop, sidebar collapsed', false, false],
  ['phone, sidebar closed', true, false],
])('the header on %s', (_name, small, navVisible) => {
  beforeEach(() => {
    mockSmallScreen = small;
    mockNavVisible = navVisible;
    render(<Header />);
  });

  it('keeps bookmarks, share and temporary chat at the right end, in one copy', () => {
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).getByTestId('bookmarks')).toBeInTheDocument();
    expect(within(actions).getByTestId('share')).toBeInTheDocument();
    expect(within(actions).getByTestId('temporary')).toBeInTheDocument();
    expect(screen.getAllByTestId('share')).toHaveLength(1);
    expect(screen.getAllByTestId('temporary')).toHaveLength(1);
  });

  it('leaves the mark, compose and the sidebar toggle to the sidebar', () => {
    expect(screen.queryByTestId('brand')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-new-chat')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-sidebar')).not.toBeInTheDocument();
  });

  it('names no model and offers no preset', () => {
    expect(screen.queryByTestId('model')).not.toBeInTheDocument();
    expect(screen.queryByTestId('presets')).not.toBeInTheDocument();
  });

  // The window controls (width, companions, right panel) are chrome for the
  // WINDOW, not for the conversation, so they sit after every conversation
  // action — last thing at the right end, the way a title bar reads.
  it('puts the window controls last in the action group', () => {
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).getByTestId('panel-controls')).toBe(actions.lastElementChild);
  });
});
