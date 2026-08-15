import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetModelsQuery } from '@hanzochat/data-provider/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Constants,
  SystemRoles,
  FileSources,
  Permissions,
  EModelEndpoint,
  isParamEndpoint,
  PermissionTypes,
  getEndpointField,
  isAgentsEndpoint,
  LocalStorageKeys,
  isEphemeralAgentId,
  isAssistantsEndpoint,
  getDefaultParamsEndpoint,
} from '@hanzochat/data-provider';
import type {
  TPreset,
  TSubmission,
  TModelsConfig,
  TConversation,
  TEndpointsConfig,
} from '@hanzochat/data-provider';
import type { AssistantListItem } from '~/common';
import {
  nameDocument,
  updateLastSelectedModel,
  getLocalStorageItems,
  getDefaultModelSpec,
  getDefaultEndpoint,
  getModelSpecPreset,
  buildDefaultConvo,
  isHanzoEndpoint,
  SMART_ROUTING_MODEL,
  resolveSmartRouting,
  logger,
} from '~/utils';
import {
  useDeleteFilesMutation,
  useGetEndpointsQuery,
  useGetStartupConfig,
  useGetRoutingDefaults,
} from '~/data-provider';
import useAssistantListMap from './Assistants/useAssistantListMap';
import { useResetChatBadges } from './useChatBadges';
import { useApplyModelSpecEffects } from './Agents';
import { usePauseGlobalAudio } from './Audio';
import { useHasAccess } from '~/hooks';
import store from '~/store';

const useNewConvo = (index = 0) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: startupConfig } = useGetStartupConfig();
  const applyModelSpecEffects = useApplyModelSpecEffects();
  const clearAllConversations = store.useClearConvoState();
  const isGuest = useAtomValue(store.user)?.role === SystemRoles.GUEST;
  const defaultPreset = useAtomValue(store.defaultPreset);
  const { setConversation } = store.useCreateConversationAtom(index);
  const [files, setFiles] = useAtom(store.filesByIndex(index));
  const saveBadgesState = useAtomValue<boolean>(store.saveBadgesState);
  const smartRoutingPref = useAtomValue<boolean | null>(store.smartRouting);
  // Server-driven org defaults (fail-soft: `available:false` when the endpoint is
  // absent/older cloud-api — resolveSmartRouting then keeps today's behavior).
  const { data: routingDefaults } = useGetRoutingDefaults();
  const { enabled: smartRouting } = resolveSmartRouting(
    smartRoutingPref,
    routingDefaults?.available ? (routingDefaults.default_session_routing ?? null) : null,
    routingDefaults?.available ? routingDefaults.auto_routing_active !== false : true,
  );
  const clearAllLatestMessages = store.useClearLatestMessages(`useNewConvo ${index}`);
  const setSubmission = useSetAtom(store.submissionByIndex(index));
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const hasAgentAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });

  const modelsQuery = useGetModelsQuery();
  const assistantsListMap = useAssistantListMap();
  const { pauseGlobalAudio } = usePauseGlobalAudio(index);
  const saveDrafts = useAtomValue<boolean>(store.saveDrafts);
  const resetBadges = useResetChatBadges();

  const { mutateAsync } = useDeleteFilesMutation({
    onSuccess: () => {
      console.log('Files deleted');
    },
    onError: (error) => {
      console.log('Error deleting files:', error);
    },
  });

  const switchToConversation = useCallback(
    async (
      conversation: TConversation,
      preset: Partial<TPreset> | null = null,
      modelsData?: TModelsConfig,
      buildDefault?: boolean,
      keepLatestMessage?: boolean,
      keepAddedConvos?: boolean,
      disableFocus?: boolean,
      _disableParams?: boolean,
    ) => {
      const modelsConfig = modelsData ?? modelsQuery.data;
      const { endpoint = null } = conversation;
      const buildDefaultConversation = (endpoint === null || buildDefault) ?? false;
      const activePreset =
        // use default preset only when it's defined,
        // preset is not provided,
        // endpoint matches or is null (to allow endpoint change),
        // and buildDefaultConversation is true
        defaultPreset &&
        !preset &&
        (defaultPreset.endpoint === endpoint || !endpoint) &&
        buildDefaultConversation
          ? defaultPreset
          : preset;

      const disableParams =
        _disableParams ??
        (activePreset?.presetId != null &&
          activePreset.presetId &&
          activePreset.presetId === defaultPreset?.presetId);

      if (buildDefaultConversation) {
        // Did the user explicitly pick a model for THIS new conversation
        // (model menu / preset)? If so, never override it — smart routing only
        // sets the *default* model, it doesn't rewrite an explicit choice.
        const userSelectedModel = !!(conversation.model ?? activePreset?.model);

        let defaultEndpoint = getDefaultEndpoint({
          convoSetup: activePreset ?? conversation,
          endpointsConfig,
        });

        // If the selected endpoint is agents but user doesn't have access, find an alternative
        // Skip this check for existing agent conversations (they have agent_id set)
        // Also check localStorage for new conversations restored after refresh
        const { lastConversationSetup } = getLocalStorageItems();
        const storedAgentId =
          isAgentsEndpoint(lastConversationSetup?.endpoint) && lastConversationSetup?.agent_id;
        const isExistingAgentConvo =
          isAgentsEndpoint(defaultEndpoint) &&
          ((conversation.agent_id && !isEphemeralAgentId(conversation.agent_id)) ||
            (storedAgentId && !isEphemeralAgentId(storedAgentId)));
        if (
          defaultEndpoint &&
          isAgentsEndpoint(defaultEndpoint) &&
          !hasAgentAccess &&
          !isExistingAgentConvo
        ) {
          defaultEndpoint = Object.keys(endpointsConfig ?? {}).find(
            (ep) => !isAgentsEndpoint(ep as EModelEndpoint) && endpointsConfig?.[ep],
          ) as EModelEndpoint | undefined;
        }

        if (!defaultEndpoint) {
          // Find first available endpoint that's not agents (if no access) or any endpoint
          defaultEndpoint = Object.keys(endpointsConfig ?? {}).find((ep) => {
            if (
              isAgentsEndpoint(ep as EModelEndpoint) &&
              !hasAgentAccess &&
              !isExistingAgentConvo
            ) {
              return false;
            }
            return !!endpointsConfig?.[ep];
          }) as EModelEndpoint;
        }

        const endpointType = getEndpointField(endpointsConfig, defaultEndpoint, 'type');
        if (!conversation.endpointType && endpointType) {
          conversation.endpointType = endpointType;
        } else if (conversation.endpointType && !endpointType) {
          conversation.endpointType = undefined;
        }

        const isAssistantEndpoint = isAssistantsEndpoint(defaultEndpoint);
        const assistants: AssistantListItem[] = assistantsListMap[defaultEndpoint] ?? [];
        const currentAssistantId = conversation.assistant_id ?? '';
        const currentAssistant = assistantsListMap[defaultEndpoint]?.[currentAssistantId] as
          | AssistantListItem
          | undefined;

        if (currentAssistantId && !currentAssistant) {
          conversation.assistant_id = undefined;
        }

        if (!currentAssistantId && isAssistantEndpoint) {
          conversation.assistant_id =
            localStorage.getItem(`${LocalStorageKeys.ASST_ID_PREFIX}${index}${defaultEndpoint}`) ??
            assistants[0]?.id;
        }

        if (
          currentAssistantId &&
          isAssistantEndpoint &&
          conversation.conversationId === Constants.NEW_CONVO
        ) {
          const assistant = assistants.find((asst) => asst.id === currentAssistantId);
          conversation.model = assistant?.model;
          updateLastSelectedModel({
            endpoint: defaultEndpoint,
            model: conversation.model,
          });
        }

        if (currentAssistantId && !isAssistantEndpoint) {
          conversation.assistant_id = undefined;
        }

        const models = modelsConfig?.[defaultEndpoint] ?? [];
        const defaultParamsEndpoint = getDefaultParamsEndpoint(endpointsConfig, defaultEndpoint);
        conversation = buildDefaultConvo({
          conversation,
          lastConversationSetup: activePreset as TConversation,
          endpoint: defaultEndpoint,
          models,
          defaultParamsEndpoint,
        });

        // Smart routing: default a fresh Hanzo-endpoint conversation to the
        // gateway's `auto` model (routes to the best/cheapest capable model).
        // Scoped to the Hanzo endpoint and only when the user hasn't picked a
        // model explicitly — provider families and explicit choices are left
        // untouched.
        if (smartRouting && !userSelectedModel && isHanzoEndpoint(defaultEndpoint)) {
          conversation.model = SMART_ROUTING_MODEL;
        }
      }

      if (disableParams === true) {
        conversation.disableParams = true;
      }

      if (!(keepAddedConvos ?? false)) {
        clearAllConversations(true);
      }
      const isCancelled = conversation.conversationId?.startsWith('_');
      if (isCancelled) {
        logger.log(
          'conversation',
          'Cancelled conversation, setting to `new` in `useNewConvo`',
          conversation,
        );
        setConversation({
          ...conversation,
          conversationId: Constants.NEW_CONVO as string,
        });
      } else {
        logger.log('conversation', 'Setting conversation from `useNewConvo`', conversation);
        setConversation(conversation);
      }
      setSubmission({} as TSubmission);
      if (!(keepLatestMessage ?? false)) {
        logger.log('latest_message', 'Clearing all latest messages');
        clearAllLatestMessages();
      }
      if (isCancelled) {
        return;
      }

      const searchParamsString = searchParams?.toString();
      const getParams = () => (searchParamsString ? `?${searchParamsString}` : '');

      if (conversation.conversationId === Constants.NEW_CONVO && !modelsData) {
        nameDocument();
        const path = `/c/${Constants.NEW_CONVO}${getParams()}`;
        navigate(path, { state: { focusChat: true } });
        return;
      }

      const path = `/c/${conversation.conversationId}${getParams()}`;
      navigate(path, {
        replace: true,
        state: disableFocus ? {} : { focusChat: true },
      });
    },
    [
      endpointsConfig,
      defaultPreset,
      assistantsListMap,
      modelsQuery.data,
      hasAgentAccess,
      smartRouting,
    ],
  );

  const newConversation = useCallback(
    function createNewConvo({
      template: _template = {},
      preset: _preset,
      modelsData,
      disableFocus,
      buildDefault = true,
      keepLatestMessage = false,
      keepAddedConvos = false,
      disableParams,
    }: {
      template?: Partial<TConversation>;
      preset?: Partial<TPreset>;
      modelsData?: TModelsConfig;
      buildDefault?: boolean;
      disableFocus?: boolean;
      keepLatestMessage?: boolean;
      keepAddedConvos?: boolean;
      disableParams?: boolean;
    } = {}) {
      pauseGlobalAudio();
      if (!saveBadgesState) {
        resetBadges();
      }

      const templateConvoId = _template.conversationId ?? '';
      const paramEndpoint =
        isParamEndpoint(_template.endpoint ?? '', _template.endpointType ?? '') === true ||
        isParamEndpoint(_preset?.endpoint ?? '', _preset?.endpointType ?? '');
      const template =
        paramEndpoint === true && templateConvoId && templateConvoId === Constants.NEW_CONVO
          ? { endpoint: _template.endpoint }
          : _template;

      /**
       * A guest is served one model — the free route the server pins them to —
       * so every conversation they open is on it, and the model chip names what
       * will actually answer rather than a default the server overrides.
       *
       * The pin is taken as given, not resolved: a new conversation otherwise
       * settles its model against the endpoint's catalog, and the free route is
       * not in that catalog, so resolving would drop it.
       */
      const guestSetup =
        isGuest && startupConfig?.guestEndpoint != null && startupConfig.guestModel != null
          ? {
              endpoint: startupConfig.guestEndpoint as EModelEndpoint,
              endpointType: EModelEndpoint.custom,
              model: startupConfig.guestModel,
            }
          : undefined;

      const conversation = {
        conversationId: Constants.NEW_CONVO as string,
        title: 'New Chat',
        endpoint: null,
        ...template,
        ...guestSetup,
        createdAt: '',
        updatedAt: '',
      };

      let preset = _preset;
      const result = getDefaultModelSpec(startupConfig);
      const defaultModelSpec = result?.default ?? result?.last;
      if (
        !preset &&
        startupConfig &&
        (startupConfig.modelSpecs?.prioritize === true ||
          (startupConfig.interface?.modelSelect ?? true) !== true ||
          (result?.last != null && Object.keys(_template).length === 0)) &&
        defaultModelSpec
      ) {
        preset = getModelSpecPreset(defaultModelSpec);
      }

      applyModelSpecEffects({
        startupConfig,
        specName: preset?.spec,
        convoId: conversation.conversationId,
      });

      if (conversation.conversationId === Constants.NEW_CONVO && !modelsData) {
        const filesToDelete = Array.from(files.values())
          .filter(
            (file) =>
              file.filepath != null &&
              file.filepath !== '' &&
              file.source &&
              !(file.embedded ?? false) &&
              file.temp_file_id,
          )
          .map((file) => ({
            file_id: file.file_id,
            embedded: !!(file.embedded ?? false),
            filepath: file.filepath as string,
            source: file.source as FileSources, // Ensure that the source is of type FileSources
          }));

        setFiles(new Map());
        localStorage.setItem(LocalStorageKeys.FILES_TO_DELETE, JSON.stringify({}));

        if (!saveDrafts && filesToDelete.length > 0) {
          mutateAsync({ files: filesToDelete });
        }
      }

      switchToConversation(
        conversation,
        preset,
        modelsData,
        guestSetup ? false : buildDefault,
        keepLatestMessage,
        keepAddedConvos,
        disableFocus,
        disableParams,
      );
    },
    [
      files,
      isGuest,
      setFiles,
      saveDrafts,
      mutateAsync,
      resetBadges,
      startupConfig,
      saveBadgesState,
      pauseGlobalAudio,
      switchToConversation,
      applyModelSpecEffects,
    ],
  );

  return {
    switchToConversation,
    newConversation,
  };
};

export default useNewConvo;
