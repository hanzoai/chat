import { dataService } from '@hanzochat/data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { FavoritesState } from '~/store/favorites';

export const useGetFavoritesQuery = <TData = FavoritesState>(
  config?: Omit<UseQueryOptions<FavoritesState, Error, TData>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<FavoritesState, Error, TData>(
    ['favorites'],
    () => dataService.getFavorites() as Promise<FavoritesState>,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useUpdateFavoritesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (favorites: FavoritesState) =>
      dataService.updateFavorites(favorites) as Promise<FavoritesState>,
    {
      // Optimistic update to prevent UI flickering when toggling favorites
      // Sets query cache immediately before the request completes
      onMutate: async (newFavorites) => {
        await queryClient.cancelQueries(['favorites']);

        const previousFavorites = queryClient.getQueryData<FavoritesState>(['favorites']);
        queryClient.setQueryData(['favorites'], newFavorites);

        return { previousFavorites };
      },
      onError: (_err, _newFavorites, context) => {
        if (context?.previousFavorites) {
          queryClient.setQueryData(['favorites'], context.previousFavorites);
        }
      },
    },
  );
};

/**
 * A favourited skill is a favourite, so it lives in the ONE favourites list: the
 * same array on the user, the same `/v1/chat/user/settings/favorites` route, the
 * same 50 cap. `useSkillFavorites` imported these two names from here and they
 * had never been written — nor had the `/favorites/skills` route and the second
 * `MAX_SKILL_FAVORITES` cap they were meant to call — so the client build could
 * not resolve them and every `vite build` of this repo failed at that import.
 *
 * A skill favourite is `{ skillId }`, a sibling of `{ agentId }` and
 * `{ model, endpoint }`. The read projects the skill slice out; the write merges
 * it back, so favourites of the other kinds ride through a skill toggle intact.
 */
const skillIds = (favorites: FavoritesState): string[] =>
  favorites.map((favorite) => favorite.skillId).filter((id): id is string => !!id);

export const useGetSkillFavoritesQuery = () =>
  useGetFavoritesQuery<string[]>({ select: skillIds });

export const useUpdateSkillFavoritesMutation = () => {
  const queryClient = useQueryClient();
  const update = useUpdateFavoritesMutation();
  const mutateAsync = useCallback(
    (ids: string[]) => {
      const current = queryClient.getQueryData<FavoritesState>(['favorites']) ?? [];
      const others = current.filter((favorite) => !favorite.skillId);
      return update.mutateAsync([...others, ...ids.map((skillId) => ({ skillId }))]);
    },
    [queryClient, update],
  );
  return { mutateAsync, isLoading: update.isLoading };
};
