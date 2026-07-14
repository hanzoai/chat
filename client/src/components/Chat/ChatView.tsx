import { memo, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useForm } from 'react-hook-form';
import { Spinner } from '@hanzochat/client';
import { useParams } from 'react-router-dom';
import { Constants, buildTree } from '@hanzochat/data-provider';
import type { TMessage } from '@hanzochat/data-provider';
import type { ChatFormValues } from '~/common';
import { ChatContext, AddedChatContext, useFileMapContext, ChatFormProvider } from '~/Providers';
import { useAddedResponse, useResumeOnLoad, useAdaptiveSSE, useChatHelpers } from '~/hooks';
import ConversationStarters from './Input/ConversationStarters';
import { useGetMessagesByConvoId } from '~/data-provider';
import BuildPreviewPane from '~/components/BuildApp/BuildPreviewPane';
import MessagesView from './Messages/MessagesView';
import Presentation from './Presentation';
import ChatForm from './Input/ChatForm';
import Landing from './Landing';
import Header from './Header';
import Footer from './Footer';
import { cn } from '~/utils';
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
  const rootSubmission = useRecoilValue(store.submissionByIndex(index));
  const centerFormOnLanding = useRecoilValue(store.centerFormOnLanding);
  const buildMode = useRecoilValue(store.buildMode);

  const fileMap = useFileMapContext();

  const { data: messagesTree = null, isLoading } = useGetMessagesByConvoId(conversationId ?? '', {
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
  } else {
    content = <Landing centerFormOnLanding={centerFormOnLanding} />;
  }

  const chatColumn = (
    <div
      className={cn(
        'relative flex h-full flex-col',
        buildMode ? 'min-w-0 flex-1' : 'w-full',
      )}
    >
      {!isLoading && <Header />}
      <>
        <div
          className={cn(
            'flex flex-col',
            isLandingPage
              ? 'flex-1 items-center justify-end sm:justify-center'
              : 'h-full overflow-y-auto',
          )}
        >
          {content}
          <div
            className={cn(
              'w-full',
              isLandingPage && 'max-w-3xl transition-all duration-200 xl:max-w-4xl',
            )}
          >
            <ChatForm index={index} />
            {isLandingPage ? <ConversationStarters /> : <Footer />}
          </div>
        </div>
        {isLandingPage && <Footer />}
      </>
    </div>
  );

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <Presentation>
            {/* Inline "build an app" mode: chat thread + side preview pane (scaffold). */}
            {buildMode ? (
              <div className="flex h-full w-full flex-row">
                {chatColumn}
                <BuildPreviewPane />
              </div>
            ) : (
              chatColumn
            )}
          </Presentation>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}

export default memo(ChatView);
