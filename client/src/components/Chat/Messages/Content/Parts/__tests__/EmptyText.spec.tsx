import { render, screen, act } from '@testing-library/react';
import EmptyText from '../EmptyText';
import { BEAT_MS } from '../quips';

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

  it('advances a beat at a time, and each beat trails off', () => {
    render(<EmptyText />);
    const first = visible();
    expect(first.endsWith('…')).toBe(true);

    tick();
    expect(visible()).not.toBe(first);
  });

  it('holds the punchline instead of looping back to the opening', () => {
    render(<EmptyText />);
    tick(12);
    const landed = visible();
    // The last beat keeps its own full stop; the trailing ellipsis is gone.
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
});
