import { useCallback, useMemo } from 'react';
import { atom, useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Constants, QueryKeys } from '@hanzochat/data-provider';
import type { TMessage } from '@hanzochat/data-provider';
import { getMessageBranchSiblingParentIds, selectActiveBranchTail } from '~/utils';
import store from '~/store';

const NULL_PARENT_KEY = '__null_parent__';
const EMPTY_PARENT_IDS: (string | null)[] = [];

const getParentLookupKey = (parentMessageId: string | null | undefined) =>
  parentMessageId ?? NULL_PARENT_KEY;

function useMessagesCacheSelect<TData>(
  messagesQueryId: string | null | undefined,
  select: (messages: TMessage[]) => TData,
): TData | null {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.messages, messagesQueryId ?? ''];

  const { data } = useQuery<TMessage[], unknown, TData>(
    queryKey,
    async () => queryClient.getQueryData<TMessage[]>(queryKey) ?? [],
    {
      enabled: false,
      select,
    },
  );

  if (!messagesQueryId) {
    return null;
  }

  return data ?? null;
}

function useLatestMessagesQueryId(
  index: string | number,
  conversationId: string | null,
  messagesQueryId?: string | null,
) {
  const { conversationId: routeConversationId } = useParams();

  if (!conversationId) {
    return null;
  }

  if (messagesQueryId != null) {
    return messagesQueryId;
  }

  if (index === 0 && routeConversationId) {
    return routeConversationId === Constants.NEW_CONVO ? Constants.NEW_CONVO : routeConversationId;
  }

  return conversationId;
}

function useLatestMessageSiblingIndexes(
  messagesQueryId: string | null | undefined,
  rootSiblingKey: string | null,
) {
  const selectParentIds = useCallback(
    (messages: TMessage[]) => getMessageBranchSiblingParentIds(messages, rootSiblingKey),
    [rootSiblingKey],
  );
  const parentIds = useMessagesCacheSelect(messagesQueryId, selectParentIds) ?? EMPTY_PARENT_IDS;
  /* The parent-id list is a fresh array on most renders, so key the derived
   * atom by its CONTENT. A jotai atomFamily compares params by identity and
   * would leak one atom per render. */
  const parentKey = parentIds.join('\u0000');
  const siblingIndexes = useMemo(
    () =>
      atom((get) => {
        const indexes: Record<string, number> = {};
        for (const parentId of parentIds) {
          indexes[getParentLookupKey(parentId)] = get(store.messagesSiblingIdxFamily(parentId));
        }
        return indexes;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentKey],
  );
  return useAtomValue(siblingIndexes);
}

export function useLatestMessage(
  index: string | number,
  messagesQueryIdOverride?: string | null,
): TMessage | null {
  const conversationId = useAtomValue(store.conversationIdByIndex(index));
  const messagesQueryId = useLatestMessagesQueryId(index, conversationId, messagesQueryIdOverride);
  const siblingIndexes = useLatestMessageSiblingIndexes(messagesQueryId, conversationId);
  const select = useCallback(
    (messages: TMessage[]) =>
      selectActiveBranchTail(
        messages,
        conversationId,
        (parentId) => siblingIndexes[getParentLookupKey(parentId)] ?? 0,
      ),
    [conversationId, siblingIndexes],
  );

  return useMessagesCacheSelect(messagesQueryId, select);
}

export function useLatestMessageId(
  index: string | number,
  messagesQueryIdOverride?: string | null,
): string | null {
  const conversationId = useAtomValue(store.conversationIdByIndex(index));
  const messagesQueryId = useLatestMessagesQueryId(index, conversationId, messagesQueryIdOverride);
  const siblingIndexes = useLatestMessageSiblingIndexes(messagesQueryId, conversationId);
  const select = useCallback(
    (messages: TMessage[]) =>
      selectActiveBranchTail(
        messages,
        conversationId,
        (parentId) => siblingIndexes[getParentLookupKey(parentId)] ?? 0,
      )?.messageId ?? null,
    [conversationId, siblingIndexes],
  );

  return useMessagesCacheSelect(messagesQueryId, select);
}
