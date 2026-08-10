import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EModelEndpoint, mergeFileConfig } from '@hanzochat/data-provider';
import type { TEndpointsConfig, Agent } from '@hanzochat/data-provider';
import { useAttach } from '../useAttach';

/**
 * What the conversation says about attaching — the derivation that decides
 * WHICH upload options a turn gets, and whether it gets any.
 *
 * This used to test `AttachFileChat`, the component that both derived this and
 * chose between two controls. The controls are gone (attaching is items in the
 * composer's "+" now) but the derivation is the part that was ever subtle:
 * an agent's endpointType comes from its provider, through a fetch when the
 * agent is not in the map, and `useResponsesApi` has to prefer an explicit
 * `false` on the conversation over the agent's `true`. So the assertions are
 * unchanged and only what they read moved — from the props of a mocked
 * component to the argument of the mocked hook.
 */

const mockEndpointsConfig: TEndpointsConfig = {
  [EModelEndpoint.openAI]: { userProvide: false, order: 0 },
  [EModelEndpoint.agents]: { userProvide: false, order: 1 },
  [EModelEndpoint.assistants]: { userProvide: false, order: 2 },
  Moonshot: { type: EModelEndpoint.custom, userProvide: false, order: 9999 },
};

const defaultFileConfig = mergeFileConfig({
  endpoints: {
    Moonshot: { fileLimit: 5 },
    [EModelEndpoint.agents]: { fileLimit: 20 },
    default: { fileLimit: 10 },
  },
});

let mockFileConfig = defaultFileConfig;

let mockAgentsMap: Record<string, Partial<Agent>> = {};
let mockAgentQueryData: Partial<Agent> | undefined;

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: mockEndpointsConfig }),
  useGetFileConfig: ({ select }: { select?: (data: unknown) => unknown }) => ({
    data: select != null ? select(mockFileConfig) : mockFileConfig,
  }),
  useGetAgentByIdQuery: () => ({ data: mockAgentQueryData }),
}));

jest.mock('~/Providers', () => ({
  useAgentsMapContext: () => mockAgentsMap,
}));

/** Capture what the derivation hands the upload machinery. */
let mockAttachFileMenuProps: Record<string, unknown> = {};
jest.mock('../useUpload', () => ({
  useUpload: (props: Record<string, unknown>) => {
    mockAttachFileMenuProps = props;
    // One item, so "this turn can attach" is observable as a length.
    return { items: [{ label: 'upload' }], upload: () => {}, portals: null };
  },
}));

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** The hook's result for one conversation, read through a probe component. */
let seen: { items: unknown[] } = { items: [] };

function renderComponent(conversation: Record<string, unknown> | null, disableInputs = false) {
  function Probe() {
    seen = useAttach(conversation as never, disableInputs) as never;
    return null;
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider>
        <Probe />
      </Provider>
    </QueryClientProvider>,
  );
}

describe('useAttach', () => {
  beforeEach(() => {
    mockFileConfig = defaultFileConfig;
    mockAgentsMap = {};
    mockAgentQueryData = undefined;
    mockAttachFileMenuProps = {};
    seen = { items: [] };
  });

  describe('whether the turn can attach at all', () => {
    it('offers items for an agents endpoint', () => {
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(seen.items.length).toBeGreaterThan(0);
    });

    it('offers items for a custom endpoint that takes files', () => {
      renderComponent({ endpoint: 'Moonshot' });
      expect(seen.items.length).toBeGreaterThan(0);
    });

    it('offers NOTHING when there is no conversation', () => {
      // An "Attach" that opens onto nothing is worse than an absent one, and an
      // empty list is what makes the "+" simply not draw the section.
      renderComponent(null);
      expect(seen.items).toHaveLength(0);
    });
  });

  describe('endpointType resolution for agents', () => {
    it('passes custom endpointType when agent provider is a custom endpoint', () => {
      mockAgentsMap = {
        'agent-1': { provider: 'Moonshot', model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.custom);
    });

    it('passes openAI endpointType when agent provider is openAI', () => {
      mockAgentsMap = {
        'agent-1': { provider: EModelEndpoint.openAI, model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.openAI);
    });

    it('passes agents endpointType when no agent provider', () => {
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.agents);
    });

    it('passes agents endpointType when no agent_id', () => {
      renderComponent({ endpoint: EModelEndpoint.agents });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.agents);
    });

    it('uses agentData query when agent not in agentsMap', () => {
      mockAgentQueryData = { provider: 'Moonshot' } as Partial<Agent>;
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-2' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.custom);
    });

    it('falls back to agentsMap provider when fetched agent omits provider', () => {
      mockAgentsMap = {
        'agent-1': { provider: EModelEndpoint.openAI, model_parameters: {} } as Partial<Agent>,
      };
      mockAgentQueryData = {} as Partial<Agent>;
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.openAI);
    });
  });

  describe('useResponsesApi resolution for agents', () => {
    it('passes useResponsesApi from fetched agent model parameters', () => {
      mockAgentQueryData = {
        provider: EModelEndpoint.azureOpenAI,
        model_parameters: { useResponsesApi: true },
      } as Partial<Agent>;
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.useResponsesApi).toBe(true);
    });

    it('falls back to agentsMap model parameters when fetched agent omits them', () => {
      mockAgentsMap = {
        'agent-1': {
          provider: EModelEndpoint.azureOpenAI,
          model_parameters: { useResponsesApi: true },
        } as Partial<Agent>,
      };
      mockAgentQueryData = { provider: EModelEndpoint.azureOpenAI } as Partial<Agent>;
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(mockAttachFileMenuProps.useResponsesApi).toBe(true);
    });

    it('preserves an explicit conversation useResponsesApi false override', () => {
      mockAgentQueryData = {
        provider: EModelEndpoint.azureOpenAI,
        model_parameters: { useResponsesApi: true },
      } as Partial<Agent>;
      renderComponent({
        endpoint: EModelEndpoint.agents,
        agent_id: 'agent-1',
        useResponsesApi: false,
      });
      expect(mockAttachFileMenuProps.useResponsesApi).toBe(false);
    });
  });

  describe('endpointType resolution for non-agents', () => {
    it('passes custom endpointType for a custom endpoint', () => {
      renderComponent({ endpoint: 'Moonshot' });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.custom);
    });

    it('passes openAI endpointType for openAI endpoint', () => {
      renderComponent({ endpoint: EModelEndpoint.openAI });
      expect(mockAttachFileMenuProps.endpointType).toBe(EModelEndpoint.openAI);
    });
  });

  describe('consistency: same endpoint type for direct vs agent usage', () => {
    it('resolves Moonshot the same way whether used directly or through an agent', () => {
      renderComponent({ endpoint: 'Moonshot' });
      const directType = mockAttachFileMenuProps.endpointType;

      mockAgentsMap = {
        'agent-1': { provider: 'Moonshot', model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      const agentType = mockAttachFileMenuProps.endpointType;

      expect(directType).toBe(agentType);
    });
  });

  describe('upload disabled rendering', () => {
    it('renders null for agents endpoint when fileConfig.agents.disabled is true', () => {
      mockFileConfig = mergeFileConfig({
        endpoints: {
          [EModelEndpoint.agents]: { disabled: true },
        },
      });
      renderComponent({
        endpoint: EModelEndpoint.agents,
        agent_id: 'agent-1',
      });
      expect(seen.items).toHaveLength(0);
    });

    it('renders null for agents endpoint when disableInputs is true', () => {
      renderComponent(
        { endpoint: EModelEndpoint.agents, agent_id: 'agent-1' },
        true,
      );
      expect(seen.items).toHaveLength(0);
    });

    it('offers exactly one item for an assistants endpoint when not disabled', () => {
      // Assistants expose no capability choice, so the menu of one IS the
      // honest shape — it is what the old plain button did, as an item.
      renderComponent({ endpoint: EModelEndpoint.assistants });
      expect(seen.items).toHaveLength(1);
    });

    it('offers items when provider config overrides agents disabled', () => {
      mockFileConfig = mergeFileConfig({
        endpoints: {
          Moonshot: { disabled: false, fileLimit: 5 },
          [EModelEndpoint.agents]: { disabled: true },
        },
      });
      mockAgentsMap = {
        'agent-1': { provider: 'Moonshot', model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(seen.items.length).toBeGreaterThan(0);
    });

    it('renders null for assistants endpoint when fileConfig.assistants.disabled is true', () => {
      mockFileConfig = mergeFileConfig({
        endpoints: {
          [EModelEndpoint.assistants]: { disabled: true },
        },
      });
      renderComponent({
        endpoint: EModelEndpoint.assistants,
      });
      expect(seen.items).toHaveLength(0);
    });
  });

  describe('endpointFileConfig resolution', () => {
    it('passes Moonshot-specific file config for agent with Moonshot provider', () => {
      mockAgentsMap = {
        'agent-1': { provider: 'Moonshot', model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      const config = mockAttachFileMenuProps.endpointFileConfig as { fileLimit?: number };
      expect(config?.fileLimit).toBe(5);
    });

    it('passes agents file config when agent has no specific provider config', () => {
      mockAgentsMap = {
        'agent-1': { provider: EModelEndpoint.openAI, model_parameters: {} } as Partial<Agent>,
      };
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      const config = mockAttachFileMenuProps.endpointFileConfig as { fileLimit?: number };
      expect(config?.fileLimit).toBe(10);
    });

    it('passes agents file config when no agent provider', () => {
      renderComponent({ endpoint: EModelEndpoint.agents });
      const config = mockAttachFileMenuProps.endpointFileConfig as { fileLimit?: number };
      expect(config?.fileLimit).toBe(20);
    });
  });
});
