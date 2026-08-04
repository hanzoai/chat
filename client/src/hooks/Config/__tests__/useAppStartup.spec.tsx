import React from 'react';
import { Provider } from 'jotai';
import { renderHook } from '@testing-library/react';

const mockUseMCPServersQuery = jest.fn();
const mockUseMCPToolsQuery = jest.fn();
const mockSpeechSettingsInit = jest.fn();

jest.mock('~/data-provider', () => ({
  useMCPServersQuery: (config: unknown) => mockUseMCPServersQuery(config),
  useMCPToolsQuery: (config: unknown) => mockUseMCPToolsQuery(config),
}));

jest.mock('../useSpeechSettingsInit', () => ({
  __esModule: true,
  default: (isAuthenticated: boolean) => mockSpeechSettingsInit(isAuthenticated),
}));

jest.mock('~/utils/timestamps', () => ({
  cleanupTimestampedStorage: jest.fn(),
}));

import useAppStartup from '../useAppStartup';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider>{children}</Provider>
);

const LOADED_SERVERS = { data: { 'test-server': { url: 'http://test' } }, isLoading: false };

/**
 * A GUEST holds a token and a user object but is NOT a member: the speech-config
 * and MCP routes refuse its bearer with a 401. Gating on `!!user` therefore fired
 * both on every anonymous load and logged a console error for each; the gate has
 * to be the real session.
 */
describe('useAppStartup — member-only startup queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMCPServersQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseMCPToolsQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('passes the real session flag to speech settings, not the presence of a user', () => {
    renderHook(() => useAppStartup({ startupConfig: undefined, isAuthenticated: false }), {
      wrapper,
    });
    expect(mockSpeechSettingsInit).toHaveBeenCalledWith(false);
  });

  it('suppresses the tools query for a guest even when servers are loaded', () => {
    mockUseMCPServersQuery.mockReturnValue(LOADED_SERVERS);

    renderHook(() => useAppStartup({ startupConfig: undefined, isAuthenticated: false }), {
      wrapper,
    });

    expect(mockUseMCPToolsQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('enables the tools query for a member once servers are loaded', () => {
    mockUseMCPServersQuery.mockReturnValue(LOADED_SERVERS);

    renderHook(() => useAppStartup({ startupConfig: undefined, isAuthenticated: true }), {
      wrapper,
    });

    expect(mockSpeechSettingsInit).toHaveBeenCalledWith(true);
    expect(mockUseMCPToolsQuery).toHaveBeenCalledWith({ enabled: true });
  });

  it('suppresses the tools query for a member with no servers loaded', () => {
    mockUseMCPServersQuery.mockReturnValue({ data: {}, isLoading: false });

    renderHook(() => useAppStartup({ startupConfig: undefined, isAuthenticated: true }), {
      wrapper,
    });

    expect(mockUseMCPToolsQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('suppresses the tools query while servers are still loading', () => {
    mockUseMCPServersQuery.mockReturnValue({ data: undefined, isLoading: true });

    renderHook(() => useAppStartup({ startupConfig: undefined, isAuthenticated: true }), {
      wrapper,
    });

    expect(mockUseMCPToolsQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('sets the document title from startup config', () => {
    renderHook(
      () =>
        useAppStartup({
          startupConfig: { appTitle: 'Hanzo Chat' } as never,
          isAuthenticated: true,
        }),
      { wrapper },
    );

    expect(document.title).toBe('Hanzo Chat');
  });
});
