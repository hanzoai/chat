import { useAtomValue } from 'jotai';
import { Constants } from '@hanzochat/data-provider';
import { pinned } from '@hanzo/ui/chat';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { TMessage } from '@hanzochat/data-provider';
import { useMessagesConversation, useMessagesSubmission } from '~/Providers';
import useScrollToRef from '~/hooks/useScrollToRef';
import store from '~/store';

const threshold = 0.85;
const debounceRate = 150;

export default function useMessageScrolling(messagesTree?: TMessage[] | null) {
  const autoScroll = useAtomValue(store.autoScroll);

  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { conversation, conversationId } = useMessagesConversation();
  const { setAbortScroll, isSubmitting, abortScroll } = useMessagesSubmission();

  const timeoutIdRef = useRef<NodeJS.Timeout>(undefined);

  const debouncedSetShowScrollButton = useCallback((value: boolean) => {
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => {
      setShowScrollButton(value);
    }, debounceRate);
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        debouncedSetShowScrollButton(!entry.isIntersecting);
      },
      { root: scrollableRef.current, threshold },
    );

    observer.observe(messagesEndRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutIdRef.current);
    };
  }, [messagesEndRef, scrollableRef, debouncedSetShowScrollButton]);

  /**
   * Whether the thread keeps following the answer, decided on every scroll.
   *
   * The rule is `pinned` — within `SLACK` of the end — read off the element the
   * reader actually scrolls. Two things follow from stating it that way. A
   * gesture that does not move away from the bottom no longer stops the follow:
   * this used to be any wheel or touch on any message while submitting, so a
   * flick with the answer already at the bottom, or a trackpad's momentum,
   * dropped the reader off the stream. And scrolling back DOWN resumes it,
   * because the answer is recomputed rather than latched — previously nothing
   * but the scroll-to-bottom button could clear it for the rest of the turn.
   */
  const handleScroll = useCallback(() => {
    const el = scrollableRef.current;
    if (!el) {
      return;
    }
    setAbortScroll(
      !pinned({ offset: el.scrollTop, viewport: el.clientHeight, content: el.scrollHeight }),
    );
  }, [setAbortScroll]);

  const scrollCallback = () => debouncedSetShowScrollButton(false);

  const { scrollToRef: scrollToBottom, handleSmoothToRef } = useScrollToRef({
    targetRef: messagesEndRef,
    callback: scrollCallback,
    smoothCallback: () => {
      scrollCallback();
      setAbortScroll(false);
    },
  });

  useEffect(() => {
    if (!messagesTree || messagesTree.length === 0) {
      return;
    }

    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    if (isSubmitting && scrollToBottom && abortScroll !== true) {
      scrollToBottom();
    }

    return () => {
      if (abortScroll === true) {
        scrollToBottom && scrollToBottom.cancel();
      }
    };
  }, [isSubmitting, messagesTree, scrollToBottom, abortScroll]);

  useEffect(() => {
    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    if (scrollToBottom && autoScroll && conversationId !== Constants.NEW_CONVO) {
      scrollToBottom();
    }
  }, [autoScroll, conversationId, scrollToBottom]);

  return {
    conversation,
    scrollableRef,
    messagesEndRef,
    scrollToBottom,
    showScrollButton,
    handleSmoothToRef,
    handleScroll,
  };
}
