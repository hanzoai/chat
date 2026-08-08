import React from 'react';
import { Provider, createStore } from 'jotai';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import store from '~/store';
import CanvasToggle from '../CanvasToggle';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

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
        <CanvasToggle />
      </Provider>,
    ),
  };
};

describe('CanvasToggle — the right edge mirror of the sidebar button', () => {
  it('renders nothing when there is no canvas to open', () => {
    withStore((s) => s.set(store.artifactsState, null));
    expect(screen.queryByTestId('canvas-toggle-button')).toBeNull();
  });

  it('renders nothing when the artifacts record is empty', () => {
    withStore((s) => s.set(store.artifactsState, {}));
    expect(screen.queryByTestId('canvas-toggle-button')).toBeNull();
  });

  it('appears once an artifact exists, and reflects visibility as pressed', () => {
    withStore((s) => {
      s.set(store.artifactsState, { a1: { id: 'a1' } as never });
      s.set(store.artifactsVisibility, true);
    });
    const btn = screen.getByTestId('canvas-toggle-button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the canvas visibility on click', async () => {
    const { s } = withStore((st) => {
      st.set(store.artifactsState, { a1: { id: 'a1' } as never });
      st.set(store.artifactsVisibility, true);
    });
    await userEvent.click(screen.getByTestId('canvas-toggle-button'));
    expect(s.get(store.artifactsVisibility)).toBe(false);
    await userEvent.click(screen.getByTestId('canvas-toggle-button'));
    expect(s.get(store.artifactsVisibility)).toBe(true);
  });
});
