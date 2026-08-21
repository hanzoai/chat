import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EModelEndpoint, mergeFileConfig } from '@hanzochat/data-provider';
import type { TEndpointsConfig, Agent } from '@hanzochat/data-provider';
import { useAttach } from '../useAttach';

/**
 * What the conversation says about attaching — whether a turn can take a file
 * at all, and what the upload machinery is told about the endpoint.
 *
 * The derivation is the part that was ever subtle: an agent's endpointType
 * comes from its provider, through a fetch when the agent is not in the map,
 * and `useResponsesApi` has to prefer an explicit `false` on the conversation
 * over the agent's `true`. Those assertions are unchanged. What moved is the
 * OTHER half: "can this turn attach" used to be observable as the length of a
 * capability menu, and is now the one boolean the composer asks for.
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
    return { add: () => {}, takes: 'both', library: null, portals: null };
  },
}));

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** The hook's result for one conversation, read through a probe component. */
let seen: { enabled: boolean } = { enabled: false };

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
    seen = { enabled: false };
  });

  describe('whether the turn can attach at all', () => {
    it('can attach on an agents endpoint', () => {
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });
      expect(seen.enabled).toBe(true);
    });

    it('can attach on a custom endpoint that takes files', () => {
      renderComponent({ endpoint: 'Moonshot' });
      expect(seen.enabled).toBe(true);
    });

    it('cannot attach when there is no conversation', () => {
      // An "Add" that opens onto nothing is worse than one that says it cannot.
      renderComponent(null);
      expect(seen.enabled).toBe(false);
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

  describe('upload disabled', () => {
    it('cannot attach for agents endpoint when fileConfig.agents.disabled is true', () => {
      mockFileConfig = mergeFileConfig({
        endpoints: {
          [EModelEndpoint.agents]: { disabled: true },
        },
      });
      renderComponent({
        endpoint: EModelEndpoint.agents,
        agent_id: 'agent-1',
      });
      expect(seen.enabled).toBe(false);
    });

    it('cannot attach for agents endpoint when disableInputs is true', () => {
      renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' }, true);
      expect(seen.enabled).toBe(false);
    });

    it('can attach on an assistants endpoint when not disabled', () => {
      renderComponent({ endpoint: EModelEndpoint.assistants });
      expect(seen.enabled).toBe(true);
    });

    it('can attach when provider config overrides agents disabled', () => {
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
      expect(seen.enabled).toBe(true);
    });

    it('cannot attach for assistants endpoint when fileConfig.assistants.disabled is true', () => {
      mockFileConfig = mergeFileConfig({
        endpoints: {
          [EModelEndpoint.assistants]: { disabled: true },
        },
      });
      renderComponent({
        endpoint: EModelEndpoint.assistants,
      });
      expect(seen.enabled).toBe(false);
    });
  });
});
