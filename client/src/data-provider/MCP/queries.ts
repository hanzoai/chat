import { useAtomValue } from 'jotai';
import { useQuery, UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import { QueryKeys, dataService } from '@hanzochat/data-provider';
import type * as t from '@hanzochat/data-provider';
import store from '~/store';

/**
 * Hook for fetching all accessible MCP servers with permission metadata
 */
export const useMCPServersQuery = <TData = t.MCPServersListResponse>(
  config?: UseQueryOptions<t.MCPServersListResponse, unknown, TData>,
): QueryObserverResult<TData> => {
  /* Member-only route: it refuses a guest bearer, so asking as one only logs a 401. */
  const isAuthenticated = useAtomValue<boolean>(store.isAuthenticated);
  return useQuery<t.MCPServersListResponse, unknown, TData>(
    [QueryKeys.mcpServers],
    () => dataService.getMCPServers(),
    {
      staleTime: 30 * 1000, // 30 seconds — short enough to pick up servers that finish initializing after first load
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
      refetchOnMount: true,
      retry: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && isAuthenticated,
    },
  );
};

/**
 * Hook for fetching MCP-specific tools
 * @param config - React Query configuration
 * @returns MCP servers with their tools
 */
export const useMCPToolsQuery = <TData = t.MCPServersResponse>(
  config?: UseQueryOptions<t.MCPServersResponse, unknown, TData>,
): QueryObserverResult<TData> => {
  return useQuery<t.MCPServersResponse, unknown, TData>(
    [QueryKeys.mcpTools],
    () => dataService.getMCPTools(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...config,
    },
  );
};
