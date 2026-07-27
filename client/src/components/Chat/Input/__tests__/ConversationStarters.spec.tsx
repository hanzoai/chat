/**
 * A conversation starter is an INTENT, not a draft.
 *
 * Clicking a chip must SEND the message — the same `submitMessage` a typed
 * message goes through — not arm the composer and wait for Enter. This failed
 * before the fix, which routed clicks through `submitPrompt`: that honors the
 * prompt-library `autoSendPrompts` preference (default OFF), so a click only
 * set the active-prompt atom and nothing was ever sent.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

const mockSubmitMessage = jest.fn();
const mockSubmitPrompt = jest.fn();
const mockChatContext = { conversation: { endpoint: 'openAI' }, isSubmitting: false };

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ user: { name: 'Tester' } }),
  useSubmitMessage: () => ({
    submitMessage: mockSubmitMessage,
    submitPrompt: mockSubmitPrompt,
  }),
}));

jest.mock('~/Providers', () => ({
  useChatContext: () => mockChatContext,
  useChatFormContext: () => ({ control: {} }),
  useAgentsMapContext: () => ({}),
  useAssistantsMapContext: () => ({}),
}));

jest.mock('react-hook-form', () => ({ useWatch: () => '' }));

jest.mock('~/data-provider', () => ({
  useGetAssistantDocsQuery: () => ({ data: new Map() }),
  useGetEndpointsQuery: () => ({ data: {} }),
}));

jest.mock('~/utils', () => ({
  getIconEndpoint: () => 'openAI',
  getEntity: () => ({ entity: undefined, isAgent: false }),
  openAppBuilder: jest.fn(),
}));

import ConversationStarters from '../ConversationStarters';

describe('ConversationStarters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatContext.isSubmitting = false;
  });

  it('SENDS the starter text on click, through the typed-message submit path', async () => {
    render(<ConversationStarters />);

    await userEvent.click(screen.getByRole('button', { name: 'Explain' }));

    expect(mockSubmitMessage).toHaveBeenCalledTimes(1);
    expect(mockSubmitMessage).toHaveBeenCalledWith({
      text: 'Explain how HTTPS keeps a connection private, in plain language.',
    });
    // The composer-arming path must NOT be used — that is the bug being fixed.
    expect(mockSubmitPrompt).not.toHaveBeenCalled();
  });

  it('sends a complete prompt, never a dangling fragment', async () => {
    render(<ConversationStarters />);

    for (const label of ['Summarize', 'Write code', 'Explain', 'Brainstorm']) {
      await userEvent.click(screen.getByRole('button', { name: label }));
    }

    expect(mockSubmitMessage).toHaveBeenCalledTimes(4);
    for (const [{ text }] of mockSubmitMessage.mock.calls) {
      expect(text).toBe(text.trim());
      expect(text).toMatch(/[.?]$/);
    }
  });

  it('does not send while a generation is already in flight', async () => {
    mockChatContext.isSubmitting = true;
    render(<ConversationStarters />);

    await userEvent.click(screen.getByRole('button', { name: 'Explain' }));

    expect(mockSubmitMessage).not.toHaveBeenCalled();
  });
});
