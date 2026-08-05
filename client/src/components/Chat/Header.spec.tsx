import { render, screen, within } from '@testing-library/react';
import Header from './Header';

/**
 * Where the header's controls sit.
 *
 * The left edge of the app is its identity and the model it is talking to. Every
 * control that acts on the OPEN conversation belongs at the right end, and there
 * is one copy of each at every width — share and temporary-chat used to be
 * written twice under opposite `isSmallScreen` conditions, which is how they
 * drifted to opposite ends of the same header.
 */

let mockSmallScreen = false;
let mockNavVisible = true;
let mockAuthenticated = true;

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
  useAuthContext: () => ({ isAuthenticated: mockAuthenticated }),
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
jest.mock('./Menus/Endpoints/ModelSelector', () => ({ __esModule: true, default: mockMarker('model') }));
jest.mock('./Menus/BookmarkMenu', () => ({ __esModule: true, default: mockMarker('bookmarks') }));
jest.mock('./ExportAndShareMenu', () => ({ __esModule: true, default: mockMarker('share') }));
jest.mock('./TemporaryChat', () => ({ TemporaryChat: mockMarker('temporary') }));
jest.mock('./AddMultiConvo', () => ({ __esModule: true, default: mockMarker('multi-convo') }));
jest.mock('~/components/Nav/BrandCorner', () => ({ __esModule: true, default: mockMarker('brand') }));

// The two states the header is actually read in. A phone with the sidebar OPEN
// is the list, not the conversation, and hides the left group entirely — so it
// would prove nothing about where the model sits.
describe.each([
  ['desktop, sidebar open', false, true],
  ['phone, sidebar closed', true, false],
])('the header on %s', (_name, small, navVisible) => {
  beforeEach(() => {
    mockSmallScreen = small;
    mockNavVisible = navVisible;
    mockAuthenticated = true;
    render(<Header />);
  });

  it('puts presets and bookmarks at the right end, not beside the model', () => {
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).getByTestId('presets')).toBeInTheDocument();
    expect(within(actions).getByTestId('bookmarks')).toBeInTheDocument();
    expect(actions).not.toContainElement(screen.getByTestId('model'));
  });

  it('keeps share and temporary chat with them, in one copy', () => {
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).getByTestId('share')).toBeInTheDocument();
    expect(within(actions).getByTestId('temporary')).toBeInTheDocument();
    expect(screen.getAllByTestId('share')).toHaveLength(1);
    expect(screen.getAllByTestId('temporary')).toHaveLength(1);
  });

  it('orders the model before every action', () => {
    const after = screen
      .getByTestId('model')
      .compareDocumentPosition(screen.getByTestId('header-actions'));
    expect(after & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/**
 * A guest is pinned to the one guest model by `enforceGuestScope`, so naming it
 * in the header states a fact the visitor cannot act on, beside a control that
 * would be refused if they did. The signed-in cases above still assert it is
 * there — this is the one state where it must not be.
 */
describe('the header signed out', () => {
  beforeEach(() => {
    mockSmallScreen = false;
    mockNavVisible = true;
    mockAuthenticated = false;
    render(<Header />);
  });

  it('names no model', () => {
    expect(screen.queryByTestId('model')).not.toBeInTheDocument();
  });

  it('still carries the actions that act on the view', () => {
    expect(screen.getByTestId('header-actions')).toBeInTheDocument();
  });
});
