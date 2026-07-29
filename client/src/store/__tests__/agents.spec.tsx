import React from 'react';
import { Provider, useAtomValue } from 'jotai';
import { renderHook, act, waitFor } from '@testing-library/react';

import { ephemeralAgentByConvoId, useApplyNewAgentTemplate } from '../agents';

jest.mock('~/utils', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>;

const useAgentTemplateHarness = (conversationId: string) => {
  const applyTemplate = useApplyNewAgentTemplate();
  const ephemeralAgent = useAtomValue(ephemeralAgentByConvoId(conversationId));
  return { applyTemplate, ephemeralAgent };
};

describe('useApplyNewAgentTemplate', () => {
  it('applies an explicit ephemeral agent when optimistic hydration makes source and target match', async () => {
    const conversationId = 'convo-123';
    const agent = {
      mcp: ['chrome-devtools'],
      skills: true,
      artifacts: 'default',
      web_search: true,
      file_search: true,
      execute_code: true,
    };
    const { result } = renderHook(() => useAgentTemplateHarness(conversationId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.applyTemplate(conversationId, conversationId, agent);
    });

    await waitFor(() => {
      expect(result.current.ephemeralAgent).toEqual(agent);
    });
  });
});
