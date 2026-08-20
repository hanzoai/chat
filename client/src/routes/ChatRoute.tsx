import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { Spinner, useToastContext } from '@hanzochat/client';
import { Constants, EModelEndpoint } from '@hanzochat/data-provider';
import { useGetModelsQuery } from '@hanzochat/data-provider/react-query';
import type { TPreset } from '@hanzochat/data-provider';
import {
  useNewConvo,
  useAppStartup,
  useAssistantListMap,
  useIdChangeEffect,
  useLocalize,
} from '~/hooks';
import { useGetConvoIdQuery, useGetStartupConfig, useGetEndpointsQuery } from '~/data-provider';
import { getDefaultModelSpec, getModelSpecPreset, logger, isNotFoundError } from '~/utils';
import { ToolCallsMapProvider } from '~/Providers';
import ChatView from '~/components/Chat/ChatView';
import { NotificationSeverity } from '~/common';
import useAuthRedirect from './useAuthRedirect';
import temporaryStore from '~/store/temporary';
import { requireLogin } from '~/utils/login';
import store from '~/store';

export default function ChatRoute() {
  const { data: startupConfig, isError: startupConfigFailed } = useGetStartupConfig();
  const { isAuthenticated, isGuest, roles } = useAuthRedirect();
  // Anonymous guests (when ALLOW_GUEST_CHAT is on) get the full chat composer,
  // scoped server-side to the free preview model. They render the same view as
  // an authenticated user, minus the capability-gated queries below.
  const canChat = isAuthenticated || isGuest;

  const defaultTemporaryChat = useAtomValue(temporaryStore.defaultTemporaryChat);
  const setIsTemporary = useSetAtom(temporaryStore.isTemporary);
  useAppStartup({ startupConfig, isAuthenticated });

  const index = 0;
  // `/` carries no param and IS a new conversation, so that is the default
  // rather than the empty string — every branch below keys off NEW_CONVO.
  const { conversationId = Constants.NEW_CONVO } = useParams();
  useIdChangeEffect(conversationId);
  const { hasSetConversation, conversation } = store.useCreateConversationAtom(index);
  const { newConversation } = useNewConvo();
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const modelsQuery = useGetModelsQuery({
    enabled: canChat,
    refetchOnMount: 'always',
  });
  const initialConvoQuery = useGetConvoIdQuery(conversationId, {
    enabled:
      isAuthenticated && conversationId !== Constants.NEW_CONVO && !hasSetConversation.current,
  });
  const endpointsQuery = useGetEndpointsQuery({ enabled: canChat });
  const assistantListMap = useAssistantListMap();

  const isTemporaryChat = conversation && conversation.expiredAt ? true : false;

  useEffect(() => {
    if (conversationId === Constants.NEW_CONVO) {
      setIsTemporary(defaultTemporaryChat);
    } else if (isTemporaryChat) {
      setIsTemporary(isTemporaryChat);
    } else {
      setIsTemporary(false);
    }
  }, [conversationId, isTemporaryChat, setIsTemporary, defaultTemporaryChat]);

  /** This effect is mainly for the first conversation state change on first load of the page.
   *  Adjusting this may have unintended consequences on the conversation state.
   */
  useEffect(() => {
    // Wait for roles to load so hasAgentAccess has a definitive value in useNewConvo.
    // Guests never load roles (no DB user); they have no agent access, so treat
    // their roles as "loaded" to let the composer initialize.
    const rolesLoaded = isGuest || roles?.USER != null;
    const shouldSetConvo =
      (startupConfig && rolesLoaded && !hasSetConversation.current && !modelsQuery.data?.initial) ??
      false;
    /* Early exit if startupConfig is not loaded and conversation is already set and only initial models have loaded */
    if (!shouldSetConvo) {
      return;
    }

    if (conversationId === Constants.NEW_CONVO && endpointsQuery.data && modelsQuery.data) {
      const result = getDefaultModelSpec(startupConfig);
      const spec = result?.default ?? result?.last;
      logger.log('conversation', 'ChatRoute, new convo effect', conversation);
      newConversation({
        modelsData: modelsQuery.data,
        template: conversation ? conversation : undefined,
        ...(spec ? { preset: getModelSpecPreset(spec) } : {}),
      });

      hasSetConversation.current = true;
    } else if (initialConvoQuery.data && endpointsQuery.data && modelsQuery.data) {
      logger.log('conversation', 'ChatRoute initialConvoQuery', initialConvoQuery.data);
      newConversation({
        template: initialConvoQuery.data,
        /* this is necessary to load all existing settings */
        preset: initialConvoQuery.data as TPreset,
        modelsData: modelsQuery.data,
        keepLatestMessage: true,
      });
      hasSetConversation.current = true;
    } else if (
      conversationId &&
      endpointsQuery.data &&
      modelsQuery.data &&
      initialConvoQuery.isError &&
      isNotFoundError(initialConvoQuery.error)
    ) {
      const result = getDefaultModelSpec(startupConfig);
      const spec = result?.default ?? result?.last;
      showToast({
        message: localize('com_ui_conversation_not_found'),
        severity: NotificationSeverity.WARNING,
      });
      logger.log(
        'conversation',
        'ChatRoute initialConvoQuery isNotFoundError',
        initialConvoQuery.error,
      );
      newConversation({
        modelsData: modelsQuery.data,
        ...(spec ? { preset: getModelSpecPreset(spec) } : {}),
      });
      hasSetConversation.current = true;
    } else if (
      conversationId === Constants.NEW_CONVO &&
      assistantListMap[EModelEndpoint.assistants] &&
      assistantListMap[EModelEndpoint.azureAssistants]
    ) {
      const result = getDefaultModelSpec(startupConfig);
      const spec = result?.default ?? result?.last;
      logger.log('conversation', 'ChatRoute new convo, assistants effect', conversation);
      newConversation({
        modelsData: modelsQuery.data,
        template: conversation ? conversation : undefined,
        ...(spec ? { preset: getModelSpecPreset(spec) } : {}),
      });
      hasSetConversation.current = true;
    } else if (
      assistantListMap[EModelEndpoint.assistants] &&
      assistantListMap[EModelEndpoint.azureAssistants]
    ) {
      logger.log('conversation', 'ChatRoute convo, assistants effect', initialConvoQuery.data);
      newConversation({
        template: initialConvoQuery.data,
        preset: initialConvoQuery.data as TPreset,
        modelsData: modelsQuery.data,
        keepLatestMessage: true,
      });
      hasSetConversation.current = true;
    }
    /* Creates infinite render if all dependencies included due to newConversation invocations exceeding call stack before hasSetConversation.current becomes truthy */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roles,
    startupConfig,
    initialConvoQuery.data,
    initialConvoQuery.isError,
    endpointsQuery.data,
    modelsQuery.data,
    assistantListMap,
  ]);

  /**
   * A dead end has to SAY so. Two states leave an anonymous visitor with no
   * path to chat at all, and both used to render as a black void:
   *   - the startup config request failed, so guest chat can never be attempted
   *   - the config loaded and says guest chat is off, and nobody is signed in
   * Neither is "still loading", so neither resolves by waiting.
   *
   * It deliberately does NOT fire while a guest mint is in flight — config
   * present + allowGuestChat true is the normal boot window, and asking there
   * would put an unprompted modal over the signed-out product, which is the one
   * thing the arrival-gate removal forbids. A mint that is ATTEMPTED and refused
   * is already handled where it happens (AuthContext.acquireGuest).
   */
  const noPathToChat =
    !canChat && (startupConfigFailed === true || startupConfig?.allowGuestChat === false);
  useEffect(() => {
    if (noPathToChat) {
      requireLogin('unavailable');
    }
  }, [noPathToChat]);

  // `isInitialLoading`, NOT `isLoading`. In react-query v4 a DISABLED query
  // reports `status: 'loading'` forever — it has no data and never will, because
  // it is never allowed to run. Both queries here are `enabled: canChat`, so an
  // anonymous visitor whose guest session never landed sat under this spinner
  // permanently: no error, no gate, no timeout, and the `!canChat` branch below
  // was unreachable dead code behind it. `isInitialLoading` is
  // `isLoading && isFetching`, which is false for a disabled query, so the
  // spinner now means "a request is in flight" and nothing else.
  if (endpointsQuery.isInitialLoading || modelsQuery.isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  if (!canChat) {
    // Renders nothing ON PURPOSE, and it is no longer silent: the effect above
    // has asked for the login gate, which is the one component that explains a
    // refusal. Returning null WITHOUT that ask is how a config fetch failing
    // turned the product into sidebar chrome over a black void.
    return null;
  }

  // if not a conversation
  if (conversation?.conversationId === Constants.SEARCH) {
    return null;
  }
  // if conversationId not match
  if (conversation?.conversationId !== conversationId && !conversation) {
    return null;
  }
  // if conversationId is null
  if (!conversationId) {
    return null;
  }

  return (
    <ToolCallsMapProvider conversationId={conversation.conversationId ?? ''}>
      <ChatView index={index} />
    </ToolCallsMapProvider>
  );
}
