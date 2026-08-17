import type { JSX } from 'react';
import { memo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useForm } from 'react-hook-form';
import { Spinner } from '@hanzochat/client';
import { useParams } from 'react-router-dom';
import { Constants, buildTree } from '@hanzochat/data-provider';
import type { TMessage } from '@hanzochat/data-provider';
import type { ChatFormValues } from '~/common';
import { ChatContext, AddedChatContext, useFileMapContext, ChatFormProvider } from '~/Providers';
import { useAddedResponse, useResumeOnLoad, useAdaptiveSSE, useChatHelpers } from '~/hooks';
import { useGetMessagesByConvoId } from '~/data-provider';
import MessagesView from './Messages/MessagesView';
import Presentation from './Presentation';
import SelectionAsk from './SelectionAsk';
import ChatForm from './Input/ChatForm';
import AnswerEngine from './Answer/AnswerEngine';
import Tour from './Tour';
import { Notice } from '~/components/Free';
import Header from './Header';
import Footer from './Footer';
import { resolveProjectSlug, projectOpener } from '~/utils/project';
import store from '~/store';

function LoadingSpinner() {
  return (
    <div className="relative flex-1 overflow-hidden overflow-y-auto">
      <div className="relative flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    </div>
  );
}

function ChatView({ index = 0 }: { index?: number }) {
  const { conversationId } = useParams();
  const rootSubmission = useAtomValue(store.submissionByIndex(index));

  const fileMap = useFileMapContext();

  const {
    data: messagesTree = null,
    isLoading,
    isInitialLoading,
  } = useGetMessagesByConvoId(conversationId ?? '', {
    select: useCallback(
      (data: TMessage[]) => {
        const dataTree = buildTree({ messages: data, fileMap });
        return dataTree?.length === 0 ? null : (dataTree ?? null);
      },
      [fileMap],
    ),
    enabled: !!fileMap,
  });

  const chatHelpers = useChatHelpers(index, conversationId);
  const addedChatHelpers = useAddedResponse();

  useAdaptiveSSE(rootSubmission, chatHelpers, false, index);

  // Auto-resume if navigating back to conversation with active job
  // Wait for messages to load before resuming to avoid race condition
  useResumeOnLoad(conversationId, chatHelpers.getMessages, index, !isLoading);

  // Project-scoped chat: when opened via `?project=<slug>` on a NEW conversation,
  // seed the composer with a short opener so the assistant has the project
  // context on the first turn. Only ever seeds a fresh conversation; an existing
  // thread is never touched. The value is read once at mount (useForm keeps its
  // own state thereafter), so re-seeding on remount can't clobber user edits.
  const seededProjectSlug =
    conversationId === Constants.NEW_CONVO || !conversationId
      ? resolveProjectSlug(typeof window !== 'undefined' ? window.location.search : '')
      : '';
  const methods = useForm<ChatFormValues>({
    defaultValues: { text: seededProjectSlug ? projectOpener(seededProjectSlug) : '' },
  });

  let content: JSX.Element | null | undefined;
  const isLandingPage =
    (!messagesTree || messagesTree.length === 0) &&
    (conversationId === Constants.NEW_CONVO || !conversationId);
  const isNavigating = (!messagesTree || messagesTree.length === 0) && conversationId != null;

  if (isLoading && conversationId !== Constants.NEW_CONVO) {
    content = <LoadingSpinner />;
  } else if ((isLoading || isNavigating) && !isLandingPage) {
    content = <LoadingSpinner />;
  } else if (!isLandingPage) {
    content = <MessagesView messagesTree={messagesTree} />;
  }

  // The landing IS the answer engine: one mode-switched input that either grounds
  // a question on the live web or opens a normal conversation. It owns its own
  // composer, so the chat composer is not rendered underneath it — a second input
  // on the same screen would be two ways to do one thing. The moment a
  // conversation exists this branch is gone and the thread renders as always.
  const chatColumn = (
    <div className="relative flex h-full w-full flex-col">
      {/* `isInitialLoading`, not `isLoading`: the messages query is DISABLED for
          a guest (no fileMap), and a disabled query reports `isLoading` forever —
          which meant a signed-out visitor never got a header at all: no sidebar
          toggle, no brand corner, no way back once the drawer was closed. */}
      {!isInitialLoading && <Header />}
      {isLandingPage ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <AnswerEngine index={index} />
          </div>
          {/* Only on the empty chat, and only for an account that has never seen
              it. Between the composer and the footer, so it greets the product
              without covering it. */}
          <Tour />
          <Footer />
        </>
      ) : (
        <div className="flex h-full flex-col overflow-y-auto">
          {content}
          <div className="w-full">
            {/* Sits with the composer, above it: when a paid model cannot serve,
                the offer to continue on Free belongs beside the thing that will
                carry the next message. */}
            <Notice />
            <ChatForm index={index} />
            <Footer />
          </div>
          {/* Highlight text in a reply → ask about just that, folded back into
              this thread. One overlay for the whole conversation; it reads the
              live selection, so it only acts on the words under the cursor. */}
          <SelectionAsk />
        </div>
      )}
    </div>
  );

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <Presentation>{chatColumn}</Presentation>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}

export default memo(ChatView);
