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
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
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

    await userEvent.click(screen.getByRole('button', { name: 'Write code' }));

    expect(mockSubmitMessage).toHaveBeenCalledTimes(1);
    expect(mockSubmitMessage).toHaveBeenCalledWith({
      text: 'Write a Python script that renames every file in a folder to a slugified version of its name.',
    });
    // The composer-arming path must NOT be used — that is the bug being fixed.
    expect(mockSubmitPrompt).not.toHaveBeenCalled();
  });

  it('sends a complete prompt, never a dangling fragment', async () => {
    render(<ConversationStarters />);

    for (const label of ['Write code', 'Make an image']) {
      await userEvent.click(screen.getByRole('button', { name: label }));
    }

    expect(mockSubmitMessage).toHaveBeenCalledTimes(2);
    for (const [{ text }] of mockSubmitMessage.mock.calls) {
      expect(text).toBe(text.trim());
      expect(text).toMatch(/[.?]$/);
    }
  });

  it('does not send while a generation is already in flight', async () => {
    mockChatContext.isSubmitting = true;
    render(<ConversationStarters />);

    await userEvent.click(screen.getByRole('button', { name: 'Write code' }));

    expect(mockSubmitMessage).not.toHaveBeenCalled();
  });

  /**
   * On a phone the row is ONE row, and which chips survive it is decided by
   * POSITION in the rendered list — the first two stand, the rest step out.
   *
   * Asserted on the class, because the rule is a media query and jsdom resolves
   * no CSS: what is checkable here is that the component asks for the right
   * behaviour at the right width. Asserted on the WHOLE list rather than on
   * named chips, because the rule is about the row's length and not about which
   * chips happen to fill it — the two actions lead, the prompts follow.
   */
  it('keeps one row on a phone: the first two chips stand, the rest step out', () => {
    render(<ConversationStarters />);

    const stepsOut = screen
      .getAllByRole('button')
      .map((chip) => chip.className.includes('max-sm:hidden'));

    expect(stepsOut).toEqual([false, false, true, true]);
  });
});
