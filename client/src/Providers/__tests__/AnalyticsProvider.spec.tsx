import React from 'react';
import { render } from '@testing-library/react';

// The analytics client and the auth context are the two seams AnalyticsBridge sits
// between; both are mocked so the test asserts the ONE decision this file owns —
// WHICH identifier is handed to identify() — rather than exercising the network or
// a real session.
const mockIdentify = jest.fn();

jest.mock('@hanzo/event/react', () => ({
  __esModule: true,
  useAnalytics: () => ({ identify: mockIdentify }),
  usePageview: () => {},
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@hanzo/observe/react', () => ({
  __esModule: true,
  ObserveProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useLocation: () => ({ pathname: '/c/new' }),
}));

const mockAuthState: {
  user?: Record<string, unknown>;
  isAuthenticated: boolean;
  token?: string;
} = {
  user: undefined,
  isAuthenticated: false,
  token: undefined,
};

jest.mock('~/hooks/AuthContext', () => ({
  __esModule: true,
  useAuthContext: () => mockAuthState,
}));

// Imported normally: babel-plugin-jest-hoist lifts the jest.mock calls above this,
// so the component below is already wired to the mocks by the time it loads.
import AnalyticsProvider from '~/Providers/AnalyticsProvider';

describe('AnalyticsProvider identity', () => {
  beforeEach(() => {
    mockIdentify.mockClear();
    mockAuthState.user = undefined;
    mockAuthState.isAuthenticated = false;
  });

  it('identifies the visitor by their Hanzo IAM subject', () => {
    // `id` is chat's own row id and `openidId` is the IAM `sub`. They are different
    // values on purpose, so a test that set only one could not tell which was used.
    mockAuthState.user = { id: 'chat-local-row-id', openidId: 'iam-sub-uuid' };
    mockAuthState.isAuthenticated = true;

    render(<AnalyticsProvider>{null}</AnalyticsProvider>);

    expect(mockIdentify).toHaveBeenCalledWith('iam-sub-uuid');
  });

  it('never identifies by the chat-local row id', () => {
    // The regression this guards is silent: identifying by the local id still
    // populates the warehouse, so nothing looks broken — but one user is split into
    // a separate identity per property, and cross-property funnels, retention and
    // paths all quietly measure nothing.
    mockAuthState.user = { id: 'chat-local-row-id', openidId: 'iam-sub-uuid' };
    mockAuthState.isAuthenticated = true;

    render(<AnalyticsProvider>{null}</AnalyticsProvider>);

    expect(mockIdentify).not.toHaveBeenCalledWith('chat-local-row-id');
  });

  it('leaves a local account with no IAM identity unidentified', () => {
    // A non-OIDC account genuinely has no IAM subject. Fabricating one would be
    // worse than leaving the visitor anonymous.
    mockAuthState.user = { id: 'chat-local-row-id' };
    mockAuthState.isAuthenticated = true;

    render(<AnalyticsProvider>{null}</AnalyticsProvider>);

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('does not identify a signed-out visitor', () => {
    mockAuthState.user = { id: 'chat-local-row-id', openidId: 'iam-sub-uuid' };
    mockAuthState.isAuthenticated = false;

    render(<AnalyticsProvider>{null}</AnalyticsProvider>);

    expect(mockIdentify).not.toHaveBeenCalled();
  });
});
