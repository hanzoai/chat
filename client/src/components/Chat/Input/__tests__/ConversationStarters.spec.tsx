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
let mockAuthenticated = true;

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ user: { name: 'Tester' }, isAuthenticated: mockAuthenticated }),
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
    mockAuthenticated = true;
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

  /**
   * The arrival screen on a phone offers ONE example, not a menu: five chips wrap
   * to three rows directly under the composer the visitor came to use.
   *
   * Asserted on the class, because the rule is a media query and jsdom resolves
   * no CSS — what is checkable here is that the component asks for the right
   * behaviour at the right width, and only when signed out.
   */
  const hidesOnPhone = (name: string) =>
    screen.getByRole('button', { name }).className.includes('max-sm:hidden');

  it('offers one example chip on a phone when signed out', () => {
    mockAuthenticated = false;
    render(<ConversationStarters />);

    expect(hidesOnPhone('Summarize')).toBe(false);
    for (const label of ['Write code', 'Explain', 'Brainstorm', 'com_ui_build_app']) {
      expect(hidesOnPhone(label)).toBe(true);
    }
  });

  it('keeps every chip at every width once signed in', () => {
    render(<ConversationStarters />);

    for (const label of ['Summarize', 'Write code', 'Explain', 'Brainstorm', 'com_ui_build_app']) {
      expect(hidesOnPhone(label)).toBe(false);
    }
  });
});
