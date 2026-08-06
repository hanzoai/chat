import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import { QueryKeys, Constants, dataService } from '@hanzochat/data-provider';
import type * as t from '@hanzochat/data-provider';
import { logger } from '~/utils';

export const useGetMessagesByConvoId = <TData = t.TMessage[]>(
  id: string,
  config?: UseQueryOptions<t.TMessage[], unknown, TData>,
): QueryObserverResult<TData> => {
  const queryClient = useQueryClient();
  return useQuery<t.TMessage[], unknown, TData>(
    [QueryKeys.messages, id],
    async () => {
      const result = await dataService.getMessagesByConvoId(id);
      if (id !== Constants.NEW_CONVO && result?.length === 1) {
        const currentMessages = queryClient.getQueryData<t.TMessage[]>([QueryKeys.messages, id]);
        if (currentMessages?.length === 1) {
          return result;
        }
        if (currentMessages && currentMessages?.length > 1) {
          logger.warn(
            'messages',
            `Messages query for convo ${id} returned fewer than cache; path: "${location.pathname}"`,
            result,
            currentMessages,
          );
          return currentMessages;
        }
      }
      return result;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};
