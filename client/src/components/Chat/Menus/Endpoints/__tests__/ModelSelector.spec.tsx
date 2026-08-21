import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Endpoint } from '~/common';

/**
 * The picker asks one question and answers it in one click.
 *
 * What this pins is the COMPOSITION — which rows exist, in what order, and what
 * a row does when pressed. It deliberately does not drive Ariakit: the menu is
 * mocked down to buttons, because a portal, a 150ms scale transition and
 * `:focus-visible` modality are that library's behaviour and testing them here
 * would measure jsdom rather than this file.
 *
 * The row's press is the load-bearing assertion. `onSelectEndpoint(endpoint,
 * { model })` is the same call the deleted endpoint drill-down made, and it is
 * the whole of the request path this component owns: from there
 * `newConversation` writes `conversation.model`, `useChatFunctions` reads it
 * into `endpointOption` via `parseCompactConvo`, and `createPayload` spreads
 * that into the POST body. Assert the call and the rest is the app's.
 */

const mockSelectEndpoint = jest.fn();
const mockSelectSpec = jest.fn();

let mockEndpoints: Endpoint[] = [];
let mockNeedsKey = (_endpoint: string) => false;
let mockConversation: Record<string, unknown> | null = { endpoint: 'Hanzo', model: 'enso' };

jest.mock('@hanzochat/data-provider', () => ({
  getConfigDefaults: () => ({ interface: { modelSelect: true } }),
  isAgentsEndpoint: (e: string) => e === 'agents',
  isAssistantsEndpoint: (e: string) => e === 'assistants',
}));

/* The trigger is an Ariakit `MenuButton`, which refuses to render outside a
   `MenuProvider` — and the provider lives inside `DropdownPopup`, which is
   mocked below. Standing the button in for itself keeps this file about the
   rows rather than about who owns the menu store. */
jest.mock('@ariakit/react', () => ({
  MenuButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

// The menu, reduced to what this file is about: a trigger and a list of rows.
// A submenu renders inline, prefixed, so `Advanced`'s contents are readable
// without driving Ariakit's hover machinery.
type Row = {
  render?: (props: Record<string, unknown>) => React.ReactElement;
  label?: string;
  separate?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  subItems?: Row[];
};
const mockFlatten = (items: Row[], under = ''): Row[] =>
  items.flatMap((item) =>
    item.subItems
      ? [{ ...item, subItems: undefined }, ...mockFlatten(item.subItems, `${item.label ?? ''} / `)]
      : [{ ...item, label: item.label == null ? undefined : `${under}${item.label}` }],
  );

jest.mock('@hanzochat/client', () => ({
  TooltipAnchor: ({ render: r }: { render: React.ReactElement }) => r,
  DropdownPopup: ({ trigger, items }: { trigger: React.ReactNode; items: Row[] }) => (
    <div>
      {trigger}
      <ul data-testid="rows">
        {mockFlatten(items).map((item, i) =>
          item.separate === true ? (
            <li key={i} role="separator" />
          ) : (
            <li key={i}>
              {/* A row that brings its own `render` replaces the label the menu
                  would have written — that is how the cost line reaches the
                  DOM, so the stand-in has to honour it or the line is untested. */}
              {item.render ? (
                item.render({ onClick: item.onClick })
              ) : (
                <button onClick={item.onClick} disabled={item.disabled}>
                  {item.label}
                </button>
              )}
            </li>
          ),
        )}
      </ul>
    </div>
  ),
}));

jest.mock('~/hooks/Input/useSelectMention', () => ({
  __esModule: true,
  default: () => ({ onSelectEndpoint: mockSelectEndpoint, onSelectSpec: mockSelectSpec }),
}));
jest.mock('~/data-provider', () => ({ useGetEndpointsQuery: () => ({ data: {} }) }));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useEndpoints: () => ({
    mappedEndpoints: mockEndpoints,
    endpointRequiresUserKey: (e: string) => mockNeedsKey(e),
  }),
}));
jest.mock('~/Providers', () => ({
  useChatContext: () => ({ conversation: mockConversation, newConversation: jest.fn() }),
}));
jest.mock('./../components/SpecIcon', () => ({ __esModule: true, default: () => <i /> }));
/* `~/utils` is a barrel, and requiring it here pulls `utils/files.ts`, which
   destructures `fileConfig` off the data-provider at module scope and throws
   against the stub above — a picker's suite dying on file-upload validation.
   `label` is taken for real because how a model id is WRITTEN is the thing
   being asserted; only `cn` is stood in for. */
jest.mock('~/utils', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
  label: jest.requireActual('~/utils/model').label,
}));

import ModelSelector, { models, stops } from '../ModelSelector';

const localize = (key: string) => key;

/** The live catalog's shape: one house family plus provider families, raw pairs. */
const endpoint = (value: string, list: string[]): Endpoint => ({
  value,
  label: value,
  hasModels: list.length > 0,
  models: list.map((name) => ({ name })),
  icon: null,
});

const CATALOG: Endpoint[] = [
  endpoint('Hanzo', ['enso', 'enso-flash', 'enso-ultra', 'enso-free', 'zen5-coder']),
  endpoint('Anthropic', ['claude-opus-4.8']),
  endpoint('agents', ['agent_abc']),
  endpoint('assistants', ['asst_abc']),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockEndpoints = CATALOG;
  mockNeedsKey = () => false;
  mockConversation = { endpoint: 'Hanzo', model: 'enso' };
});

describe('what the catalog is allowed to offer', () => {
  it('does not list agents or assistants — they are not models', () => {
    const all = models(CATALOG, () => false, [], {}).map((c) => c.endpoint);
    expect(all).not.toContain('agents');
    expect(all).not.toContain('assistants');
  });

  it('does not list a model whose key the header would have to ask for', () => {
    const all = models(CATALOG, (e) => e === 'Anthropic', [], {});
    expect(all.map((c) => c.endpoint)).not.toContain('Anthropic');
  });

  // The free route is where the gateway LANDS you, not something to ask for —
  // and the server sorts it to the front for a free-plan caller, so left in it
  // would be the first row offered.
  it('does not list the free route', () => {
    const all = models(CATALOG, () => false, [], {});
    expect(all.map((c) => c.model)).not.toContain('enso-free');
  });

  it('writes a model the way this app writes it, not as a raw id', () => {
    const all = models(CATALOG, () => false, [], {});
    expect(all.map((c) => c.name)).toContain('Enso Flash');
    expect(all.map((c) => c.name)).toContain('claude-opus-4.8');
  });

  it('defers to the deployment when it names its own models', () => {
    const spec = { name: 'house', label: 'Everyday', preset: { endpoint: 'Hanzo', model: 'zen5' } };
    const all = models(CATALOG, () => false, [spec as never], {});
    expect(all.map((c) => c.name)).toEqual(['Everyday']);
  });
});

describe('the effort axis', () => {
  it('is three stops named for what they do, mapped onto the router tiers', () => {
    const axis = stops(models(CATALOG, () => false, [], {}), localize);
    expect(axis.map((s) => s.name)).toEqual(['Instant', 'com_ui_medium', 'com_ui_high']);
    expect(axis.map((s) => s.model)).toEqual(['enso-flash', 'enso', 'enso-ultra']);
  });

  it('drops a stop the deployment cannot honour rather than promising it', () => {
    const axis = stops(models([endpoint('Hanzo', ['enso'])], () => false, [], {}), localize);
    expect(axis.map((s) => s.model)).toEqual(['enso']);
  });

  it('charges only the top stop', () => {
    const axis = stops(models(CATALOG, () => false, [], {}), localize);
    expect(axis.filter((s) => s.costly).map((s) => s.model)).toEqual(['enso-ultra']);
  });
});

describe('the picker', () => {
  const labels = () =>
    [...screen.getByTestId('rows').querySelectorAll('button')].map((b) => b.textContent);

  it('offers three adjectives and hides every model behind Advanced', () => {
    render(<ModelSelector startupConfig={undefined} />);
    expect(labels()).toEqual([
      'Instant',
      'com_ui_medium',
      'com_ui_highConsumes usage limits faster',
      'com_ui_advanced',
      'com_ui_advanced / Enso',
      'com_ui_advanced / Enso Flash',
      'com_ui_advanced / Enso Ultra',
      'com_ui_advanced / Zen5 Coder',
      'com_ui_advanced / claude-opus-4.8',
      'com_ui_advanced / Reset to default',
    ]);
  });

  it('names no model in the first list', () => {
    render(<ModelSelector startupConfig={undefined} />);
    const first = labels().slice(0, labels().indexOf('com_ui_advanced'));
    expect(first.join(' ')).not.toMatch(/enso|zen|claude|gpt/i);
  });

  // The whole point of the component: one press changes what answers you.
  it('sends the endpoint and the model together when a stop is pressed', async () => {
    render(<ModelSelector startupConfig={undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Instant' }));
    expect(mockSelectEndpoint).toHaveBeenCalledWith('Hanzo', { model: 'enso-flash' });
  });

  it('sends the model when one is chosen under Advanced', async () => {
    render(<ModelSelector startupConfig={undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'com_ui_advanced / Zen5 Coder' }));
    expect(mockSelectEndpoint).toHaveBeenCalledWith('Hanzo', { model: 'zen5-coder' });
  });

  it('resets to the model a fresh conversation would have resolved', async () => {
    render(<ModelSelector startupConfig={undefined} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'com_ui_advanced / Reset to default' }),
    );
    expect(mockSelectEndpoint).toHaveBeenCalledWith('Hanzo', { model: 'enso' });
  });

  it('shows the stop the conversation is on', () => {
    render(<ModelSelector startupConfig={undefined} />);
    expect(screen.getByRole('button', { name: 'Intelligence' })).toHaveTextContent('com_ui_medium');
  });

  it('picks a deployment-named model as a spec, so its name survives the switch', async () => {
    const spec = { name: 'house', label: 'Everyday', preset: { endpoint: 'Hanzo', model: 'zen5' } };
    render(<ModelSelector startupConfig={{ modelSpecs: { list: [spec] } } as never} />);
    await userEvent.click(screen.getByRole('button', { name: 'Everyday' }));
    expect(mockSelectSpec).toHaveBeenCalledWith(spec);
    expect(mockSelectEndpoint).not.toHaveBeenCalled();
  });

  // A deployment with no router tiers has no effort to sell, and a menu whose
  // only row opens another menu is worse than a plain list.
  it('falls back to a plain list when there is no axis to present', () => {
    mockEndpoints = [endpoint('Anthropic', ['claude-opus-4.8'])];
    render(<ModelSelector startupConfig={undefined} />);
    expect(labels()).toEqual(['claude-opus-4.8']);
  });

  it('renders nothing when the deployment turns the choice off', () => {
    render(<ModelSelector startupConfig={{ interface: { modelSelect: false } } as never} />);
    expect(screen.queryByTestId('rows')).not.toBeInTheDocument();
  });
});
