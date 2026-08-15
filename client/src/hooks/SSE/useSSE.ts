import { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { SSE } from 'sse.js';
import { useSetAtom } from 'jotai';
import {
  request,
  Constants,
  balanceOn,
  /* @ts-ignore */
  createPayload,
  LocalStorageKeys,
  removeNullishValues,
  renewBearer,
} from '@hanzochat/data-provider';
import type { TMessage, TPayload, TSubmission, EventSubmission } from '@hanzochat/data-provider';
import { useAnalytics } from '@hanzo/event/react';
import { EVENTS } from '@hanzo/event';
import type { EventHandlerParams } from './useEventHandlers';
import type { TResData } from '~/common';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import useEventHandlers from './useEventHandlers';
import { requireLogin } from '~/utils/login';
import { offerSwitch } from '~/utils/free';
import store from '~/store';

const clearDraft = (conversationId?: string | null) => {
  if (conversationId) {
    localStorage.removeItem(`${LocalStorageKeys.TEXT_DRAFT}${conversationId}`);
    localStorage.removeItem(`${LocalStorageKeys.FILES_DRAFT}${conversationId}`);
  } else {
    localStorage.removeItem(`${LocalStorageKeys.TEXT_DRAFT}${Constants.NEW_CONVO}`);
    localStorage.removeItem(`${LocalStorageKeys.FILES_DRAFT}${Constants.NEW_CONVO}`);
  }
};

type ChatHelpers = Pick<
  EventHandlerParams,
  | 'setMessages'
  | 'getMessages'
  | 'setConversation'
  | 'setIsSubmitting'
  | 'newConversation'
  | 'resetLatestMessage'
>;

export default function useSSE(
  submission: TSubmission | null,
  chatHelpers: ChatHelpers,
  isAddedRequest = false,
  runIndex = 0,
) {
  const setActiveRunId = useSetAtom(store.activeRunFamily(runIndex));
  const analytics = useAnalytics();

  const { token, isAuthenticated } = useAuthContext();
  const [completed, setCompleted] = useState(new Set());
  const setAbortScroll = useSetAtom(store.abortScrollFamily(runIndex));
  const setShowStopButton = useSetAtom(store.showStopButtonByIndex(runIndex));

  const {
    setMessages,
    getMessages,
    setConversation,
    setIsSubmitting,
    newConversation,
    resetLatestMessage,
  } = chatHelpers;

  const {
    clearStepMaps,
    stepHandler,
    syncHandler,
    finalHandler,
    errorHandler,
    messageHandler,
    contentHandler,
    createdHandler,
    attachmentHandler,
    abortConversation,
  } = useEventHandlers({
    setMessages,
    getMessages,
    setCompleted,
    isAddedRequest,
    setConversation,
    setIsSubmitting,
    newConversation,
    setShowStopButton,
    resetLatestMessage,
  });

  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && balanceOn(startupConfig),
  });

  useEffect(() => {
    if (submission == null || Object.keys(submission).length === 0) {
      return;
    }

    let { userMessage } = submission;

    const payloadData = createPayload(submission);
    let { payload } = payloadData;
    payload = removeNullishValues(payload) as TPayload;

    let textIndex = null;
    clearStepMaps();

    /** The ONE place a chat generation's outcome is known: this effect owns the
     *  whole stream lifecycle, so timing it here covers every endpoint exactly
     *  once (no per-endpoint emit to keep in sync). Identifiers + duration only —
     *  never prompt or response text. */
    const startedAt = Date.now();
    const genProps = () => ({
      endpoint: submission?.conversation?.endpoint ?? undefined,
      model: submission?.conversation?.model ?? undefined,
      durationMs: Date.now() - startedAt,
    });

    const sse = new SSE(payloadData.server, {
      payload: JSON.stringify(payload),
      /* Only claim an identity when there is one — see useResumableSSE. */
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    sse.addEventListener('attachment', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        attachmentHandler({ data, submission: submission as EventSubmission });
      } catch (error) {
        console.error(error);
      }
    });

    sse.addEventListener('message', (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      if (data.final != null) {
        clearDraft(submission.conversation?.conversationId);
        analytics.capture(EVENTS.GENERATION_COMPLETED, genProps());
        try {
          finalHandler(data, submission as EventSubmission);
        } catch (error) {
          console.error('Error in finalHandler:', error);
          setIsSubmitting(false);
          setShowStopButton(false);
        }
        balanceOn(startupConfig) && balanceQuery.refetch();
        console.log('final', data);
        return;
      } else if (data.created != null) {
        const runId = v4();
        setActiveRunId(runId);
        userMessage = {
          ...userMessage,
          ...data.message,
          overrideParentMessageId: userMessage.overrideParentMessageId,
        };

        createdHandler(data, { ...submission, userMessage } as EventSubmission);
      } else if (data.event != null) {
        stepHandler(data, { ...submission, userMessage } as EventSubmission);
      } else if (data.sync != null) {
        const runId = v4();
        setActiveRunId(runId);
        /* synchronize messages to Assistants API as well as with real DB ID's */
        syncHandler(data, { ...submission, userMessage } as EventSubmission);
      } else if (data.type != null) {
        const { text, index } = data;
        if (text != null && index !== textIndex) {
          textIndex = index;
        }

        contentHandler({ data, submission: submission as EventSubmission });
      } else {
        const text = data.text ?? data.response;

        const initialResponse = {
          ...(submission.initialResponse as TMessage),
          parentMessageId: data.parentMessageId,
          messageId: data.messageId,
        };

        if (data.message != null) {
          messageHandler(text, { ...submission, userMessage, initialResponse });
        }
      }
    });

    sse.addEventListener('open', () => {
      setAbortScroll(false);
      console.log('connection is opened');
    });

    sse.addEventListener('cancel', async () => {
      const streamKey = (submission as TSubmission | null)?.['initialResponse']?.messageId;
      if (completed.has(streamKey)) {
        setIsSubmitting(false);
        setCompleted((prev) => {
          prev.delete(streamKey);
          return new Set(prev);
        });
        return;
      }

      setCompleted((prev) => new Set(prev.add(streamKey)));
      const latestMessages = getMessages();
      const conversationId = latestMessages?.[latestMessages.length - 1]?.conversationId;
      try {
        await abortConversation(
          conversationId ??
            userMessage.conversationId ??
            submission.conversation?.conversationId ??
            '',
          submission as EventSubmission,
          latestMessages,
        );
      } catch (error) {
        console.error('Error during abort:', error);
        setIsSubmitting(false);
        setShowStopButton(false);
      }
    });

    sse.addEventListener('error', async (e: MessageEvent) => {
      /* @ts-ignore sse.js attaches the HTTP status to the error event */
      const responseCode = e.responseCode as number | undefined;

      if (responseCode === 401) {
        /* IAM refused the token; ask it for a fresh one and retry */
        try {
          const token = (await renewBearer()) ?? '';
          if (!token) {
            throw new Error('Nothing left to renew.');
          }
          sse.headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          };

          request.dispatchTokenUpdatedEvent(token);
          sse.stream();
          return;
        } catch (error) {
          /* nothing left to refresh: the visitor really is not signed in */
          console.log(error);
          requireLogin('anonymous');
          setIsSubmitting(false);
          return;
        }
      }

      console.log('error in server stream.');
      // A failed answer, not a crash: the funnel needs the drop counted, and
      // `responseCode` is what separates "we were rate-limited/out of credit"
      // from "the model failed". A 401 or 403 that recovered above never reaches
      // here, so what this counts is real loss rather than a renewable credential.
      analytics.capture(EVENTS.GENERATION_FAILED, {
        ...genProps(),
        responseCode,
      });
      balanceOn(startupConfig) && balanceQuery.refetch();

      let data: TResData | undefined = undefined;
      try {
        data = JSON.parse(e.data) as TResData;
      } catch (error) {
        console.error(error);
        console.log(e);
        setIsSubmitting(false);
      }

      // Same offer the resumable path makes, at the other place a refusal lands.
      offerSwitch(responseCode, data);

      errorHandler({ data, submission: { ...submission, userMessage } as EventSubmission });
    });

    setIsSubmitting(true);
    sse.stream();

    return () => {
      const isCancelled = sse.readyState <= 1;
      sse.close();
      if (isCancelled) {
        const e = new Event('cancel');
        /* @ts-ignore */
        sse.dispatchEvent(e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission]);
}
