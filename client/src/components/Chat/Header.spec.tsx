import { render, screen, within } from '@testing-library/react';
import Header from './Header';

/**
 * What the chat header carries, and what it must NOT.
 *
 * Five controls: the effort picker at the left, then share, files and sources,
 * the overflow menu and private at the right. This file is what keeps a sixth
 * from growing back.
 *
 * THE PICKER IS BACK, and the reasoning it replaces is worth keeping. This file
 * used to assert `names no model`, on the grounds that the house default is
 * right and a picker under the cursor asks "which model?" on every turn. That
 * was true of the picker that existed: it opened onto ENDPOINTS, made you hover
 * one to reveal its models, and had presets, agents and assistants beside them —
 * five words for one decision, four of which mean nothing to a person who has
 * not read the config. Hiding THAT in Settings was right. What sits there now
 * asks a different question, in one adjective, and hiding that costs someone a
 * trip to Settings to think harder about one hard question.
 *
 * WHAT IS REFUSED HERE, each because it has another home:
 * - compose — the sidebar is a rail when collapsed and never gives up its own
 *   compose button, so a copy here is two of them side by side above md;
 * - the mark and the sidebar toggle — the sidebar's corner, same reason;
 * - the window controls — chrome for the window, not for the conversation;
 * - presets — deleted from the app, not moved.
 *
 * The mocks stay wired to the modules that would render each control, so moving
 * one back across that line fails these tests rather than quietly restoring a
 * duplicate. Mock EVERY child the header renders: a partial stub of
 * `@hanzochat/data-provider` holds only until something deeper wants one more
 * name, and when it throws it throws while `./Header` is being required on line
 * 2 — so the suite dies at IMPORT and reports `Tests: 0 total`, which reads in
 * CI as a passing file. This file sat that way long enough for its own contract
 * to reverse underneath it. Check for `Tests: 0` before believing it is green.
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
  getConfigDefaults: () => ({ interface: { modelSelect: true } }),
  PermissionTypes: { BOOKMARKS: 'BOOKMARKS', MULTI_CONVO: 'MULTI_CONVO' },
  Permissions: { USE: 'USE' },
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({
    data: { interface: { modelSelect: true }, sharedLinksEnabled: true },
  }),
}));

jest.mock('~/hooks', () => ({
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
  HeaderNewChat: mockMarker('header-new-chat'),
  OpenSidebar: mockMarker('open-sidebar'),
}));
jest.mock('./Menus/Endpoints/ModelSelector', () => ({
  __esModule: true,
  default: mockMarker('effort'),
}));
jest.mock('./Menus/ConvoMenu', () => ({ __esModule: true, default: mockMarker('convo-menu') }));
jest.mock('./Menus/CanvasToggle', () => ({ __esModule: true, default: mockMarker('sources') }));
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

  it('asks the one question at the left, in one copy, outside the action group', () => {
    expect(screen.getAllByTestId('effort')).toHaveLength(1);
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).queryByTestId('effort')).not.toBeInTheDocument();
  });

  it('leaves compose, the mark and the sidebar toggle to the sidebar', () => {
    expect(screen.queryByTestId('header-new-chat')).not.toBeInTheDocument();
    expect(screen.queryByTestId('brand')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-sidebar')).not.toBeInTheDocument();
  });

  // The membership of the group, not just its order. A `queryByTestId` for a
  // control this file no longer mocks can never fail — the module is gone, so
  // the marker was never going to render either way. Reading the group's actual
  // children is what refuses the window controls, a bookmark button, or
  // anything else growing back into the row.
  it('carries share, sources, the overflow menu and private — and nothing else', () => {
    const actions = screen.getByTestId('header-actions');
    expect([...actions.children].map((c) => c.getAttribute('data-testid'))).toEqual([
      'share',
      'sources',
      'convo-menu',
      'temporary',
    ]);
  });

  // Private decides what the NEXT conversation is; the other three act on THIS
  // one. So private reads last, after the things it is not about.
  it('puts private last, after the controls that act on the open thread', () => {
    const actions = screen.getByTestId('header-actions');
    expect(within(actions).getByTestId('temporary')).toBe(actions.lastElementChild);
  });
});
