import 'test/matchMedia.mock';

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'jotai';
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

describe('Signature', () => {
  afterEach(() => {
    localStorage.removeItem('signature');
  });

  it('renders nothing when unset — the foot reserves no space for silence', () => {
    seed(null);
    const { container } = render(
      <Provider>
        <Signature />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when whitespace', () => {
    seed('   ');
    const { container } = render(
      <Provider>
        <Signature />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the line, trimmed, with the full text on the title', () => {
    seed('  — The Zoo Queen  ');
    const { getByTestId } = render(
      <Provider>
        <Signature />
      </Provider>,
    );
    const el = getByTestId('nav-signature');
    expect(el).toHaveTextContent('— The Zoo Queen');
    expect(el).toHaveAttribute('title', '— The Zoo Queen');
    // One line at any width: the truncation class is the responsive contract.
    expect(el.className).toContain('truncate');
  });
});
