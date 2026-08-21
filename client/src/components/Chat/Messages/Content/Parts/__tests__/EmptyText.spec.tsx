import { render, screen, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import EmptyText from '../EmptyText';
import { BEAT_MS, POOLS, beats } from '../quips';
import store from '~/store';

/**
 * The indicator schedules ONE timer per beat and the next only after it
 * re-renders, so bulk-advancing the clock fires exactly one. Each beat needs
 * its own tick — which is also what keeps a stalled render from racing ahead.
 */
const tick = (n = 1) => {
  for (let i = 0; i < n; i++) {
    act(() => {
      jest.advanceTimersByTime(BEAT_MS);
    });
  }
};

let mockLanguage = 'en';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockLanguage } }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => (key === 'com_ui_thinking' ? 'Thinking...' : key),
}));

/** The visible joke, which is the half a screen reader is told to skip. */
const visible = () => document.querySelector('[aria-hidden="true"]')?.textContent ?? '';

describe('the thinking indicator', () => {
  beforeEach(() => {
    mockLanguage = 'en';
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('says something, rather than nothing', () => {
    render(<EmptyText />);
    expect(visible().length).toBeGreaterThan(0);
  });

  it('advances a beat at a time, and each beat MOVES while it waits', () => {
    const { container } = render(<EmptyText />);
    const first = visible();

    // Three dots, not a literal ellipsis. The character was static for the
    // whole wait, so a reply in progress read as a sentence trailing off; the
    // one question this state answers is whether anything is happening.
    expect(container.querySelectorAll('.thinking-dots i')).toHaveLength(3);
    // The quip carries the shimmer for the same reason — motion IS the signal.
    expect(container.querySelector('.shimmer')).toBeTruthy();

    tick();
    expect(visible()).not.toBe(first);
  });

  it('holds the punchline instead of looping back to the opening', () => {
    render(<EmptyText />);
    tick(12);
    const landed = visible();
    // The punchline has landed, so the waiting mark goes with it — dots that
    // keep moving after the line settles say work is still arriving when it is
    // only the joke holding.
    expect(landed.endsWith('…')).toBe(false);

    tick(6);
    expect(visible()).toBe(landed);
  });

  it('tells a screen reader one plain word, not four joke fragments', () => {
    render(<EmptyText />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    tick(3);
    expect(screen.getAllByText('Thinking...')).toHaveLength(1);
  });

  it('leaves the span empty in another language, so the plain dot draws', () => {
    mockLanguage = 'ja';
    const { container } = render(<EmptyText />);
    expect(container.querySelector('.result-thinking')?.textContent).toBe('');
  });

  it('drops its timer when the answer arrives', () => {
    const { unmount } = render(<EmptyText />);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  /**
   * The joke is about what was ASKED — which is the difference between a quip
   * and a screensaver. The indicator takes no props, so it reads the live
   * submission itself; this renders it inside a store that holds one and checks
   * the words that appear come from the pool that prompt earns.
   */
  it('tells a joke about the thing you asked for', () => {
    const code = POOLS.find((p) => p.name === 'code')!.quips;
    const jotai = createStore();
    jotai.set(store.submission, {
      userMessage: { text: 'there is a bug in my python function' },
    } as never);

    render(
      <Provider store={jotai}>
        <EmptyText />
      </Provider>,
    );

    // The opening beat is enough to identify the quip, and it is what a reader
    // sees first — an answer that arrives quickly shows only this one.
    const openings = code.map((q) => beats(q)[0]);
    expect(openings).toContain(visible().replace(/…$/, ''));
  });

  it('falls back to the general pool when the prompt is about nothing special', () => {
    const topical = POOLS.flatMap((p) => p.quips).map((q) => beats(q)[0]);
    const jotai = createStore();
    jotai.set(store.submission, { userMessage: { text: 'hello there' } } as never);

    render(
      <Provider store={jotai}>
        <EmptyText />
      </Provider>,
    );
    expect(topical).not.toContain(visible().replace(/…$/, ''));
  });
});
