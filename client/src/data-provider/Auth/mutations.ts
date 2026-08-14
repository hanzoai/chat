import { useResetAtom } from 'jotai/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationKeys, dataService } from '@hanzochat/data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type * as t from '@hanzochat/data-provider';
import useClearStates from '~/hooks/Config/useClearStates';
import { clearAllConversationStorage } from '~/utils';
import store from '~/store';

export const useDeleteUserMutation = (
  options?: t.MutationOptions<unknown, void>,
): UseMutationResult<unknown, unknown, void, unknown> => {
  const queryClient = useQueryClient();
  const clearStates = useClearStates();
  const resetDefaultPreset = useResetAtom(store.defaultPreset);

  return useMutation([MutationKeys.deleteUser], {
    mutationFn: () => dataService.deleteUser(),
    ...(options || {}),
    onSuccess: (...args) => {
      resetDefaultPreset();
      clearStates();
      clearAllConversationStorage();
      queryClient.removeQueries();
      options?.onSuccess?.(...args);
    },
  });
};
