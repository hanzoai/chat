import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { GuiTestProvider } from 'test/gui-provider';
import ChatDirection from './ChatDirection';
import store from '~/store';

/**
 * This control shipped with no test, which is how it kept a defect that is
 * obvious in a screenshot: the visible face read `ltr` — the untranslated
 * internal token — while the aria-label read "Left to Right". The readable
 * phrase existed in all 41 locales and was computed right there; it was just
 * spent only on the accessible name. So the two audiences got different text,
 * and the sighted one got the worse of it.
 */
const renderIt = (initial?: 'LTR' | 'RTL') => {
  const jotai = createStore();
  if (initial) jotai.set(store.chatDirection, initial);
  return render(
    <Provider store={jotai}>
      <GuiTestProvider>
        <ChatDirection />
      </GuiTestProvider>
    </Provider>,
  );
};

describe('ChatDirection', () => {
  it('shows the readable direction, not the internal token', () => {
    renderIt('LTR');
    const button = screen.getByTestId('chatDirection');
    expect(button).toHaveTextContent('Left to Right');
    // The specific regression: the raw enum must not be what a user reads.
    expect(button.textContent?.trim()).not.toBe('ltr');
  });

  it('says the same thing to a screen reader as it does on screen', () => {
    renderIt('LTR');
    const button = screen.getByTestId('chatDirection');
    // The accessible name may add context ("Chat direction: …") but must not
    // contradict the visible label — that mismatch was the bug.
    expect(button.getAttribute('aria-label')).toContain(button.textContent?.trim());
  });

  it('toggles both directions and keeps them readable', () => {
    renderIt('LTR');
    const button = screen.getByTestId('chatDirection');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Right to Left');
    expect(button.getAttribute('aria-label')).toContain('Right to Left');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Left to Right');
  });
});
