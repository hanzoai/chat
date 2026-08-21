import { useRef, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Add from '../Add';
import Chips from '../Chips';

/**
 * The one menu, and the loop it closes.
 *
 * A tool is a field on the turn's ephemeral agent, so "choosing Web Search"
 * and "the Web Search chip" have to be the same fact seen twice. The fake
 * context below is the real contract — `isToolEnabled` to read,
 * `debouncedChange` to write — backed by state, so the assertions run the
 * whole round trip: press the row, the chip appears; press Backspace at the
 * head of the field, it is gone.
 *
 * A signed-in reader is what makes this worth testing here rather than in a
 * browser: the two runnable tools are role-gated, and this fork verifies every
 * bearer against hanzo.id, so a local browser has no way to hold a role.
 */

const mockAttach = {
  add: jest.fn(),
  takes: 'both' as const,
  library: null,
  enabled: true,
  portals: null,
};
jest.mock('../Files/useAttach', () => ({ useAttach: () => mockAttach }));

/**
 * en, and only the keys this menu reads.
 *
 * A key with no entry here renders as the key itself, so the assertions below
 * read as English exactly as long as every label goes through `localize`. That
 * is the second thing this file now measures: hard-coding one of these strings
 * back into the component would not change what it says in en, and nothing else
 * in the suite would notice.
 */
const EN: Record<string, string> = {
  com_ui_add: 'Add',
  com_ui_add_files: 'Add files',
  com_ui_add_from_library: 'Add from library',
  com_ui_add_photos: 'Add photos',
  com_ui_add_photos_files: 'Add photos & files',
  com_ui_create_image: 'Create image',
  com_ui_deep_research: 'Deep research',
  com_ui_remove_tool: 'Remove {{0}}',
  com_ui_slash_hint: 'Type / for quick access',
  com_ui_soon: 'Soon',
  com_ui_study: 'Study',
  com_ui_tools: 'Tools',
  com_ui_view_all_tools: 'View all tools',
  com_ui_web_search: 'Web Search',
  com_ui_write_code: 'Write code',
};

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, vars?: Record<string, string>) => {
    const text = EN[key] ?? key;
    return vars ? text.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? '') : text;
  },
  useHasAccess: () => true,
  useAgentCapabilities: () => ({ codeEnabled: true, webSearchEnabled: true }),
}));

/** A menu, flattened: label, the trailing slot, and whether it can be pressed. */
jest.mock('@hanzochat/client', () => ({
  MCPIcon: () => null,
  TooltipAnchor: ({ render }: any) => render,
  DropdownPopup: ({ trigger, items }: any) => (
    <div>
      {trigger}
      <div data-testid="menu">
        {items
          .filter((i: any) => i.show !== false)
          .map((i: any, n: number) =>
            i.separate === true ? (
              <hr key={n} />
            ) : i.render != null && i.label == null ? (
              <div key={n}>{i.render}</div>
            ) : (
              <button
                key={n}
                data-testid="row"
                disabled={i.disabled}
                role={i.ariaChecked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
                aria-checked={i.ariaChecked}
                onClick={i.onClick}
              >
                {i.label}
                {i.kbd != null && <kbd>{i.kbd}</kbd>}
              </button>
            ),
          )}
      </div>
    </div>
  ),
}));

jest.mock('@ariakit/react', () => ({
  MenuButton: ({ children, ...p }: any) => <button {...p}>{children}</button>,
}));

/** The ToolsContext contract, backed by state so a write is readable. */
let mockCtx: any;
jest.mock('~/Providers', () => ({ useToolsContext: () => mockCtx }));

function Harness() {
  const [search, setSearch] = useState(false);
  const [code, setCode] = useState(false);
  const field = useRef<HTMLTextAreaElement | null>(null);
  mockCtx = {
    agentsConfig: { capabilities: [] },
    webSearch: { isToolEnabled: search, debouncedChange: ({ value }: any) => setSearch(value) },
    codeInterpreter: { isToolEnabled: code, debouncedChange: ({ value }: any) => setCode(value) },
    mcpServerManager: { mcpValues: [], selectableServers: [], toggleServerSelection: jest.fn() },
  };
  return (
    <>
      <Chips textAreaRef={field} />
      <textarea ref={field} data-testid="field" />
      <Add conversation={null} disabled={false} />
    </>
  );
}

const rows = () => screen.getAllByTestId('row');
const labels = () => rows().map((r) => r.textContent);

beforeEach(() => {
  mockAttach.add.mockClear();
  render(<Harness />);
});

describe('the one menu', () => {
  it('offers files first, then every tool, in one list', () => {
    expect(labels()).toEqual([
      'Add photos & files',
      'Web Search',
      'Create imageSoon',
      'Deep researchSoon',
      'Write code',
      'StudySoon',
    ]);
  });

  it('greys nothing out', () => {
    for (const row of rows()) {
      expect(row).not.toBeDisabled();
    }
  });

  it('marks the tools this build cannot run, in the slot a shortcut would use', () => {
    for (const name of ['Create image', 'Deep research', 'Study']) {
      const row = rows().find((r) => r.textContent?.startsWith(name))!;
      expect(within(row).getByText('Soon')).toBeInTheDocument();
      expect(row).toHaveAttribute('role', 'menuitem');
    }
  });

  it('makes the runnable tools checkable, and starts them off', () => {
    for (const name of ['Web Search', 'Write code']) {
      const row = rows().find((r) => r.textContent === name)!;
      expect(row).toHaveAttribute('role', 'menuitemcheckbox');
      expect(row).toHaveAttribute('aria-checked', 'false');
    }
  });

  it('says how to reach the same actions by keyboard', () => {
    expect(screen.getByText('Type / for quick access')).toBeInTheDocument();
  });

  it('opens the file picker from the files row', () => {
    fireEvent.click(rows()[0]);
    expect(mockAttach.add).toHaveBeenCalledTimes(1);
  });
});

describe('a tool, and the chip that is the same fact', () => {
  const press = (name: string) => fireEvent.click(rows().find((r) => r.textContent === name)!);
  const chips = () => screen.queryAllByRole('listitem').map((c) => c.textContent);

  it('shows nothing until a tool is on', () => {
    expect(chips()).toEqual([]);
  });

  it('turns the tool on and shows it', () => {
    press('Web Search');
    expect(rows().find((r) => r.textContent === 'Web Search')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(chips()[0]).toContain('Web Search');
  });

  it('carries one chip per tool', () => {
    press('Web Search');
    press('Write code');
    expect(chips().map((c) => c?.replace(/Remove.*/, ''))).toEqual(['Web Search', 'Write code']);
  });

  it('takes it back off from the chip', () => {
    press('Web Search');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Web Search' }));
    expect(chips()).toEqual([]);
    expect(rows().find((r) => r.textContent === 'Web Search')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('takes the last one off with Backspace at the head of the field', () => {
    press('Web Search');
    press('Write code');
    const field = screen.getByTestId('field') as HTMLTextAreaElement;
    field.setSelectionRange(0, 0);
    fireEvent.keyDown(field, { key: 'Backspace' });
    expect(chips().map((c) => c?.replace(/Remove.*/, ''))).toEqual(['Web Search']);
  });

  it('leaves the chips alone when the caret is inside the text', () => {
    press('Web Search');
    const field = screen.getByTestId('field') as HTMLTextAreaElement;
    field.value = 'hello';
    field.setSelectionRange(5, 5);
    fireEvent.keyDown(field, { key: 'Backspace' });
    expect(chips()[0]).toContain('Web Search');
  });
});
