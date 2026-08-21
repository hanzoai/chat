import React from 'react';
import { Provider, createStore } from 'jotai';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import store from '~/store';
import Sources from '../Sources';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));

jest.mock('@hanzochat/client', () => ({
  __esModule: true,
  TooltipAnchor: ({ render: r }: { render: React.ReactElement }) => r,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const withStore = (init?: (s: ReturnType<typeof createStore>) => void) => {
  const s = createStore();
  init?.(s);
  return {
    s,
    ...render(
      <Provider store={s}>
        <Sources />
      </Provider>,
    ),
  };
};

describe('Files and sources — the way into the panel beside the thread', () => {
  it('renders nothing when there is nothing to show', () => {
    withStore((s) => s.set(store.artifactsState, null));
    expect(screen.queryByTestId('sources-button')).toBeNull();
  });

  it('renders nothing when the record is empty', () => {
    withStore((s) => s.set(store.artifactsState, {}));
    expect(screen.queryByTestId('sources-button')).toBeNull();
  });

  it('appears once there is something, and reflects visibility as pressed', () => {
    withStore((s) => {
      s.set(store.artifactsState, { a1: { id: 'a1' } as never });
      s.set(store.artifactsVisibility, true);
    });
    expect(screen.getByTestId('sources-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the panel on click', async () => {
    const { s } = withStore((st) => {
      st.set(store.artifactsState, { a1: { id: 'a1' } as never });
      st.set(store.artifactsVisibility, true);
    });
    await userEvent.click(screen.getByTestId('sources-button'));
    expect(s.get(store.artifactsVisibility)).toBe(false);
    await userEvent.click(screen.getByTestId('sources-button'));
    expect(s.get(store.artifactsVisibility)).toBe(true);
  });

  // The word is retired, not merely unused: a control that still said "canvas"
  // would keep teaching a name the rest of the product has stopped using.
  it('says nothing about a canvas', () => {
    withStore((s) => {
      s.set(store.artifactsState, { a1: { id: 'a1' } as never });
    });
    expect(screen.getByTestId('sources-button').getAttribute('aria-label')).toBe(
      'com_ui_files_and_sources',
    );
  });
});
