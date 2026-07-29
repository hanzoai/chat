import { useAtomValue } from 'jotai';
import { QueryKeys, dataService } from '@hanzochat/data-provider';
import { useQuery } from '@tanstack/react-query';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type t from '@hanzochat/data-provider';
import store from '~/store';

export const useGetBannerQuery = (
  config?: UseQueryOptions<t.TBannerResponse>,
): QueryObserverResult<t.TBannerResponse> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<t.TBannerResponse>([QueryKeys.banner], () => dataService.getBanner(), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};

export const useGetUserBalance = (
  config?: UseQueryOptions<t.TBalanceResponse>,
): QueryObserverResult<t.TBalanceResponse> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<t.TBalanceResponse>([QueryKeys.balance], () => dataService.getUserBalance(), {
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};

export const useGetUserUsage = (
  config?: UseQueryOptions<t.TUsageResponse>,
): QueryObserverResult<t.TUsageResponse> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<t.TUsageResponse>([QueryKeys.usage], () => dataService.getUserUsage(), {
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};

// Canonical cloud AI usage (GET /v1/get-cloud-usages, proxied). Keyed by range so a
// range switch refetches. Returns the raw payload (a @hanzo/usage `CloudUsageOverview`
// or `{ enabled: false }`); the consumer normalizes it with `@hanzo/usage`.
export const useGetCloudUsage = (
  range: string,
  config?: UseQueryOptions<unknown>,
): QueryObserverResult<unknown> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<unknown>([QueryKeys.cloudUsage, range], () => dataService.getCloudUsage(range), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};

export const useGetRoutingDefaults = (
  config?: UseQueryOptions<t.TRoutingDefaultsResponse>,
): QueryObserverResult<t.TRoutingDefaultsResponse> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<t.TRoutingDefaultsResponse>(
    [QueryKeys.routingDefaults],
    () => dataService.getRoutingDefaults(),
    {
      // Org defaults change rarely; never block a boot on this fetch.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
    },
  );
};

export const useGetSearchEnabledQuery = (
  config?: UseQueryOptions<boolean>,
): QueryObserverResult<boolean> => {
  const queriesEnabled = useAtomValue<boolean>(store.queriesEnabled);
  return useQuery<boolean>([QueryKeys.searchEnabled], () => dataService.getSearchEnabled(), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};
