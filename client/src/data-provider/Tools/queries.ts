import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { Constants, QueryKeys, dataService } from '@hanzochat/data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type t from '@hanzochat/data-provider';
import store from '~/store';

export const useVerifyAgentToolAuth = (
  params: t.VerifyToolAuthParams,
  config?: UseQueryOptions<t.VerifyToolAuthResponse>,
): QueryObserverResult<t.VerifyToolAuthResponse> => {
  /* Member-only route: it refuses a guest bearer, so asking as one only logs a 401
     (three on every anonymous boot — code interpreter, then web search). */
  const isAuthenticated = useAtomValue<boolean>(store.isAuthenticated);
  return useQuery<t.VerifyToolAuthResponse>(
    [QueryKeys.toolAuth, params.toolId],
    () => dataService.getVerifyAgentToolAuth(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && isAuthenticated,
    },
  );
};

export const useGetToolCalls = <TData = t.ToolCallResults>(
  params: t.GetToolCallParams,
  config?: UseQueryOptions<t.ToolCallResults, unknown, TData>,
): QueryObserverResult<TData, unknown> => {
  const { conversationId = '' } = params;
  return useQuery<t.ToolCallResults, unknown, TData>(
    [QueryKeys.toolCalls, conversationId],
    () => dataService.getToolCalls(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled:
        conversationId.length > 0 &&
        conversationId !== Constants.NEW_CONVO &&
        conversationId !== Constants.PENDING_CONVO &&
        conversationId !== Constants.SEARCH,
      ...config,
    },
  );
};

export const useMCPConnectionStatusQuery = (
  config?: UseQueryOptions<t.MCPConnectionStatusResponse>,
): QueryObserverResult<t.MCPConnectionStatusResponse> => {
  return useQuery<t.MCPConnectionStatusResponse>(
    [QueryKeys.mcpConnectionStatus],
    () => dataService.getMCPConnectionStatus(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 10000, // 10 seconds
      ...config,
    },
  );
};

export const useMCPAuthValuesQuery = (
  serverName: string,
  config?: UseQueryOptions<t.MCPAuthValuesResponse>,
): QueryObserverResult<t.MCPAuthValuesResponse> => {
  return useQuery<t.MCPAuthValuesResponse>(
    [QueryKeys.mcpAuthValues, serverName],
    () => dataService.getMCPAuthValues(serverName),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled: !!serverName,
      ...config,
    },
  );
};
