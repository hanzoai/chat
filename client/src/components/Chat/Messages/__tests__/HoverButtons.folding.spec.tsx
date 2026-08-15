/**
 * Below `sm` the row keeps what a reader reaches for and folds the rest behind
 * ⋯. What matters is that folding MOVES a control and never drops one, so each
 * case asks for the same action twice: is it in the row, and is it reachable.
 *
 * jsdom does no layout, so the geometry — 44px targets, the popover over the
 * thread — is not what this pins. The contract is.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TConversation, TMessage } from '@hanzochat/data-provider';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useGenerationsByLatest: () => ({
    hideEditButton: false,
    regenerateEnabled: true,
    continueSupported: false,
    forkingSupported: true,
    isEditableEndpoint: true,
  }),
}));

jest.mock('~/components/Conversations', () => ({
  Fork: ({ label }: { label?: string }) => <button type="button">{label ?? 'fork'}</button>,
}));

jest.mock('../Feedback', () => () => <button type="button">feedback</button>);

jest.mock('../MessageAudio', () => ({
  __esModule: true,
  default: ({ renderButton }: { renderButton: (p: Record<string, unknown>) => React.ReactNode }) =>
    renderButton({ onClick: jest.fn(), title: 'com_ui_read_aloud', icon: null }),
}));

import HoverButtons from '../HoverButtons';

const widthIs = (matches: boolean) =>
  (window.matchMedia = jest.fn().mockImplementation((media) => ({
    matches,
    media,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia);

const draw = () =>
  render(
    <HoverButtons
      index={0}
      isLast={true}
      isEditing={false}
      isSubmitting={false}
      enterEdit={jest.fn()}
      regenerate={jest.fn()}
      handleContinue={jest.fn()}
      handleFeedback={jest.fn()}
      copyToClipboard={jest.fn()}
      latestMessage={null}
      message={{ messageId: 'm1', text: 'hi', isCreatedByUser: false } as TMessage}
      conversation={{ conversationId: 'c1', endpoint: 'openAI' } as TConversation}
    />,
  );

const row = () => screen.getByRole('button', { name: 'com_ui_copy_to_clipboard' }).parentElement!;
const inRow = (name: string) =>
  Array.from(row().querySelectorAll('button')).some(
    (b) => b.title === name || b.textContent === name,
  );

describe('the message action row, folded', () => {
  it('keeps every control in the row above sm', async () => {
    widthIs(false);
    draw();

    expect(screen.queryByRole('button', { name: 'com_ui_more_options' })).toBeNull();
    expect(inRow('com_ui_read_aloud')).toBe(true);
    expect(inRow('com_ui_edit')).toBe(true);
    expect(inRow('com_ui_fork')).toBe(false); // the stub prints its label only when folded
    expect(inRow('com_ui_regenerate')).toBe(true);
  });

  it('below sm the secondary half leaves the row and is reachable behind ⋯', async () => {
    widthIs(true);
    draw();

    expect(inRow('com_ui_read_aloud')).toBe(false);
    expect(inRow('com_ui_edit')).toBe(false);
    expect(inRow('com_ui_copy_to_clipboard')).toBe(true);
    expect(inRow('com_ui_regenerate')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'com_ui_more_options' }));

    expect(screen.getByRole('button', { name: 'com_ui_read_aloud' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_fork' })).toBeInTheDocument();
  });

  it('an action that fires dismisses the sheet; fork, which opens its own, does not', async () => {
    widthIs(true);
    draw();

    /** The folded controls are reachable exactly while the sheet is showing. */
    const showing = () => screen.queryByRole('button', { name: 'com_ui_edit' });

    await userEvent.click(screen.getByRole('button', { name: 'com_ui_more_options' }));
    await userEvent.click(screen.getByRole('button', { name: 'com_ui_fork' }));
    expect(showing()).toBeInTheDocument();

    await userEvent.click(showing()!);
    expect(showing()).toBeNull();
  });
});
