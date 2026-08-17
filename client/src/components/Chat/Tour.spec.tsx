import { render, screen, fireEvent } from '@testing-library/react';
import type { TUser } from '@hanzochat/data-provider';
import Tour from './Tour';

/** `mock`-prefixed, because a jest.mock factory may reference nothing else. */
const mockDismiss = jest.fn();
let mockAuth: { isAuthenticated: boolean; user?: Partial<TUser> };

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => mockAuth,
}));

jest.mock('~/data-provider', () => ({
  useDismissTourMutation: () => ({ mutate: mockDismiss }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const paint = (over: typeof mockAuth) => {
  mockAuth = over;
  return render(<Tour />);
};

const card = () => screen.queryByTestId('tour');

beforeEach(() => mockDismiss.mockClear());

describe('the welcome card', () => {
  it('greets an account that has never seen it', () => {
    paint({ isAuthenticated: true, user: { toured: false } });
    expect(card()).toBeInTheDocument();
  });

  it('names the four things, once each', () => {
    paint({ isAuthenticated: true, user: { toured: false } });
    const lines = ['com_tour_model', 'com_tour_sources', 'com_tour_agents', 'com_tour_history'];
    for (const line of lines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it('stays away from an account that has already seen it', () => {
    paint({ isAuthenticated: true, user: { toured: true } });
    expect(card()).not.toBeInTheDocument();
  });

  // The one that matters. An account created before this shipped carries no
  // `toured` at all, and a falsy test would greet the entire existing user base
  // on the deploy that added the card.
  it('stays away from an account that predates it', () => {
    paint({ isAuthenticated: true, user: {} });
    expect(card()).not.toBeInTheDocument();
  });

  it('stays away from a visitor with no account', () => {
    paint({ isAuthenticated: false, user: undefined });
    expect(card()).not.toBeInTheDocument();
  });

  it('records the dismissal, so it is shown once and not once per device', () => {
    paint({ isAuthenticated: true, user: { toured: false } });
    fireEvent.click(screen.getByTestId('tour-dismiss'));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
