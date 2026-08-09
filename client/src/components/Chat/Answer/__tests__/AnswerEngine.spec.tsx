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


/**
 * "Maximize chat space" has to reach the LANDING, not just the docked composer.
 *
 * The atom was honoured in `ChatForm` and hardcoded in `AnswerEngine`, which
 * WRAPS ChatForm — so the composer widened to `max-w-full` inside a parent that
 * had not moved, `100%` resolved to that parent's `xl:max-w-4xl`, and pressing
 * the button changed nothing you could see. `aria-pressed` flipped and the value
 * persisted, which is why it read as "the control does not work" rather than as
 * a layout bug one level up.
 *
 * Read the SOURCE rather than rendering: the failure is a hardcoded class
 * reappearing on the column, and that is a fact about the file. A render test
 * would pass just as happily with the cap restored on some ancestor.
 */
describe('the conversation column has ONE width law', () => {
  const read = (p: string) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fs').readFileSync(require('path').join(__dirname, p), 'utf8');

  it('AnswerEngine sizes from COLUMN, never its own cap', () => {
    const src = read('../AnswerEngine.tsx');
    expect(src).toMatch(/COLUMN\(maximizeChatSpace\)/);
    // The literal the fix removed. `md:max-w-3xl xl:max-w-4xl` belongs in COLUMN
    // and nowhere else — spelled here again it silently outranks the atom.
    expect(src).not.toMatch(/className="[^"]*xl:max-w-4xl/);
  });

  it('ChatForm reads the same law, so the two cannot disagree', () => {
    const src = read('../../Input/ChatForm.tsx');
    expect(src).toMatch(/COLUMN\(maximizeChatSpace\)/);
    expect(src).not.toMatch(/maximizeChatSpace \? 'max-w-full'/);
  });
});
