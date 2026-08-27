import { useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { CSSTransition } from 'react-transition-group';
import type { TMessage } from '@hanzochat/data-provider';
import { useScreenshot, useMessageScrolling } from '~/hooks';
import ScrollToBottom from '~/components/Messages/ScrollToBottom';
import { MessagesViewProvider } from '~/Providers';
import MultiMessage from './MultiMessage';
import store from '~/store';

function MessagesViewContent({
  messagesTree: _messagesTree,
}: {
  messagesTree?: TMessage[] | null;
}) {
  const { screenshotTargetRef } = useScreenshot();
  const scrollButtonPreference = useAtomValue(store.showScrollButton);
  const [currentEditId, setCurrentEditId] = useState<number | string | null>(-1);
  const scrollToBottomRef = useRef<HTMLButtonElement>(null);

  const {
    conversation,
    scrollableRef,
    messagesEndRef,
    showScrollButton,
    handleSmoothToRef,
    handleScroll,
  } = useMessageScrolling(_messagesTree);

  const { conversationId } = conversation ?? {};

  return (
    <>
      <div className="relative flex-1 overflow-hidden overflow-y-auto">
        <div className="relative h-full">
          <div
            className="scrollbar-gutter-stable"
            onScroll={handleScroll}
            ref={scrollableRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              width: '100%',
            }}
          >
            <div className="flex flex-col pb-9 pt-14 dark:bg-transparent">
              {/* An empty thread renders NOTHING, and that is the fix rather than a
                  better sentence. This branch used to print `com_ui_nothing_found`
                  — "Nothing found" — which is the SEARCH empty state, borrowed for
                  a question nobody asked here.

                  It is reached on the ordinary path, not an exceptional one.
                  `chatSurface` moves to `thread` BEFORE the conversation exists
                  server-side, deliberately, so the echo of the message just sent
                  and the thinking indicator mount immediately (see ChatView: the
                  landing used to hold for the 10.5s that takes). For that window
                  the tree is empty — so the first thing a person saw after
                  sending their first message was a report that their search had
                  failed.

                  There is nothing to say here. The composer is on screen, the
                  pending message and its indicator mount a beat later, and an
                  empty column is what "your conversation starts here" looks
                  like. A message in this slot can only be wrong: too early to
                  be an empty state, too late to be a greeting. */}
              {(_messagesTree && _messagesTree.length == 0) || _messagesTree === null ? null : (
                <>
                  <div ref={screenshotTargetRef}>
                    <MultiMessage
                      key={conversationId}
                      messagesTree={_messagesTree}
                      messageId={conversationId ?? null}
                      setCurrentEditId={setCurrentEditId}
                      currentEditId={currentEditId ?? null}
                    />
                  </div>
                </>
              )}
              <div
                id="messages-end"
                className="group h-0 w-full flex-shrink-0"
                ref={messagesEndRef}
              />
            </div>
          </div>

          <CSSTransition
            in={showScrollButton && scrollButtonPreference}
            timeout={{
              enter: 550,
              exit: 700,
            }}
            classNames="scroll-animation"
            unmountOnExit={true}
            appear={true}
            nodeRef={scrollToBottomRef}
          >
            <ScrollToBottom ref={scrollToBottomRef} scrollHandler={handleSmoothToRef} />
          </CSSTransition>
        </div>
      </div>
    </>
  );
}

export default function MessagesView({ messagesTree }: { messagesTree?: TMessage[] | null }) {
  return (
    <MessagesViewProvider>
      <MessagesViewContent messagesTree={messagesTree} />
    </MessagesViewProvider>
  );
}
