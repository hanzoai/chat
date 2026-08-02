import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * The landing must open in the mode that WORKS for a visitor who arrives with
 * nothing.
 *
 * It opened on `search`, which relays to cloud `/v1/ask` and needs a real
 * principal — so an anonymous visitor's very first message was a 401. `chat` is
 * the guest-scoped preview, and when even that is refused its submit path opens
 * the login gate instead of printing a refusal into the thread.
 */

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ isGuest: true }),
}));

jest.mock('~/hooks/useAnswer', () => ({
  __esModule: true,
  default: () => ({
    query: '',
    answer: '',
    sources: [],
    followUps: [],
    status: '',
    isLoading: false,
    error: '',
    needsSignIn: false,
    run: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  }),
}));

/** The real composers drag in the whole chat tree; only the CHOICE is under test. */
jest.mock('~/components/Chat/Input/ChatForm', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-composer" />,
}));
jest.mock('~/components/Chat/Input/ConversationStarters', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../AnswerComposer', () => ({
  __esModule: true,
  default: () => <div data-testid="search-composer" />,
}));
jest.mock('../AnswerView', () => ({ __esModule: true, default: () => null }));

import AnswerEngine from '../AnswerEngine';

const renderAt = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AnswerEngine />
    </MemoryRouter>,
  );

describe('AnswerEngine default mode', () => {
  it('opens on chat, the mode that works without signing in', () => {
    renderAt();

    expect(screen.getByRole('button', { name: 'com_answer_mode_chat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'com_answer_mode_search' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('mounts the chat composer, not the search one', () => {
    renderAt();

    expect(screen.getByTestId('chat-composer')).toBeInTheDocument();
    expect(screen.queryByTestId('search-composer')).not.toBeInTheDocument();
  });

  it('still opens on chat for a deep link that carries chat intent', () => {
    renderAt('/c/new?q=hello&submit=true');

    expect(screen.getByRole('button', { name: 'com_answer_mode_chat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lets the visitor choose search — the default is not a restriction', async () => {
    renderAt();

    await userEvent.click(screen.getByRole('button', { name: 'com_answer_mode_search' }));

    expect(screen.getByRole('button', { name: 'com_answer_mode_search' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('search-composer')).toBeInTheDocument();
  });
});
