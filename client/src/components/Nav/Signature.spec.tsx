import 'test/matchMedia.mock';

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'jotai';
import { GuiTestProvider } from 'test/gui-provider';
import Signature from './Signature';

/** The atom reads localStorage at init, so each case seeds the store the way
 *  the browser would have. */
const seed = (value: string | null) => {
  if (value === null) {
    localStorage.removeItem('signature');
  } else {
    localStorage.setItem('signature', JSON.stringify(value));
  }
};

/** The line is a @hanzo/ui-era gui primitive, so it needs the provider the app
 *  mounts; rendered bare it throws `Missing theme.` from inside the primitive. */
const wrap = (ui: React.ReactNode) => (
  <GuiTestProvider>
    <Provider>{ui}</Provider>
  </GuiTestProvider>
);

describe('Signature', () => {
  afterEach(() => {
    localStorage.removeItem('signature');
  });

  /** The provider owns `container.firstChild` now, so absence is asserted on the
   *  line itself rather than on the container being empty. */
  it('renders nothing when unset — the foot reserves no space for silence', () => {
    seed(null);
    const { queryByTestId } = render(wrap(<Signature />));
    expect(queryByTestId('nav-signature')).toBeNull();
  });

  it('renders nothing when whitespace', () => {
    seed('   ');
    const { queryByTestId } = render(wrap(<Signature />));
    expect(queryByTestId('nav-signature')).toBeNull();
  });

  it('renders the line, trimmed, with the full text on the title', () => {
    seed('  — The Zoo Queen  ');
    const { getByTestId } = render(wrap(<Signature />));
    const el = getByTestId('nav-signature');
    expect(el).toHaveTextContent('— The Zoo Queen');
    // gui types no HTML attributes, so the hover affordance is worth pinning:
    // it survives only because Signature spreads it.
    expect(el).toHaveAttribute('title', '— The Zoo Queen');
  });

  /**
   * One line at any width. This used to assert the string `truncate` appeared in
   * className, which stopped meaning anything the moment the utility went away;
   * the contract is the three declarations that utility stood for, and gui emits
   * real CSS for them, so they can be read instead of guessed at.
   */
  it('stays on one line, ellipsized', () => {
    seed('— a sign-off long enough that one sidebar width could never hold it');
    const { getByTestId } = render(wrap(<Signature />));
    const style = getComputedStyle(getByTestId('nav-signature'));
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.overflowX).toBe('hidden');
  });

  /** The line centres itself in the sidebar's width, which an inline box cannot do. */
  it('is a block box', () => {
    seed('— The Zoo Queen');
    const { getByTestId } = render(wrap(<Signature />));
    expect(getComputedStyle(getByTestId('nav-signature')).display).toBe('block');
  });
});
