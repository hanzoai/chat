import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { Constants } from '@hanzochat/data-provider';
import { useMediaQuery } from '@hanzochat/client';
import type { TConversation } from '@hanzochat/data-provider';
import EndpointIcon from '~/components/Endpoints/EndpointIcon';
import { useNavigateToConvo, useLocalize, useShiftKey, useConvoRename } from '~/hooks';
import { useGetEndpointsQuery } from '~/data-provider';
import { ConvoOptions } from './ConvoOptions';
import RenameForm from './RenameForm';
import ConvoLink from './ConvoLink';
import { cn } from '~/utils';
import store from '~/store';

interface ConversationProps {
  conversation: TConversation;
  retainView: () => void;
  toggleNav: () => void;
  isGenerating?: boolean;
}

export default function Conversation({
  conversation,
  retainView,
  toggleNav,
  isGenerating = false,
}: ConversationProps) {
  const params = useParams();
  const localize = useLocalize();
  const { navigateToConvo } = useNavigateToConvo();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const currentConvoId = useMemo(() => params.conversationId, [params.conversationId]);
  const activeConvos = useAtomValue(store.allConversationsSelector);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const isShiftHeld = useShiftKey();
  const { conversationId, title = '', tags, isPinned = false } = conversation;

  const { titleInput, setTitleInput, renaming, startRename, cancelRename, submitRename } =
    useConvoRename(conversationId, title);
  const [isPopoverActive, setIsPopoverActive] = useState(false);
  // Lazy-load ConvoOptions to avoid running heavy hooks for all conversations
  const [hasInteracted, setHasInteracted] = useState(false);
  /** Pointer position of the last right-click; null means anchor to the kebab. */
  const contextPointRef = useRef<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isActiveConvo = useMemo(() => {
    if (conversationId === Constants.NEW_CONVO) {
      return currentConvoId === Constants.NEW_CONVO;
    }

    if (currentConvoId !== Constants.NEW_CONVO) {
      return currentConvoId === conversationId;
    } else {
      const latestConvo = activeConvos?.[0];
      return latestConvo === conversationId;
    }
  }, [currentConvoId, conversationId, activeConvos]);

  const handleRename = useCallback(() => {
    setIsPopoverActive(false);
    startRename();
  }, [startRename]);

  const handleMouseEnter = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  const handleMouseLeave = useCallback(() => {
    if (!isPopoverActive) {
      setHasInteracted(false);
    }
  }, [isPopoverActive]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Don't reset if focus is moving to a child element within this container
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      if (!isPopoverActive) {
        setHasInteracted(false);
      }
    },
    [isPopoverActive],
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setIsPopoverActive(open);
    if (!open) {
      contextPointRef.current = null;
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (container && !container.contains(document.activeElement)) {
          setHasInteracted(false);
        }
      });
    }
  }, []);

  /**
   * Full right-click: opens the SAME menu the kebab opens, anchored at the
   * pointer instead of the button. Mounting is lazy, so record the point and
   * mark the row interacted before asking the menu to open.
   */
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    contextPointRef.current = { x: e.clientX, y: e.clientY };
    setHasInteracted(true);
    setIsPopoverActive(true);
  }, []);

  const getAnchorRect = useCallback(() => contextPointRef.current, []);

  const handleNavigation = (ctrlOrMetaKey: boolean) => {
    if (ctrlOrMetaKey) {
      toggleNav();
      const baseUrl = window.location.origin;
      const path = `/c/${conversationId}`;
      window.open(baseUrl + path, '_blank');
      return;
    }

    if (currentConvoId === conversationId || isPopoverActive) {
      return;
    }

    toggleNav();

    if (typeof title === 'string' && title.length > 0) {
      document.title = title;
    }

    navigateToConvo(conversation, {
      currentConvoId,
      resetLatestMessage: !(conversationId ?? '') || conversationId === Constants.NEW_CONVO,
    });
  };

  const convoOptionsProps = {
    title,
    tags,
    isPinned,
    retainView,
    renameHandler: handleRename,
    isActiveConvo,
    conversationId,
    isPopoverActive,
    setIsPopoverActive: handlePopoverOpenChange,
    isShiftHeld: isActiveConvo ? isShiftHeld : false,
    getAnchorRect,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex h-12 w-full items-center rounded-lg outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white md:h-9',
        isActiveConvo || isPopoverActive
          ? 'bg-surface-active-alt before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:rounded-full before:bg-black dark:before:bg-white'
          : 'hover:bg-surface-active-alt',
      )}
      role="button"
      tabIndex={renaming ? -1 : 0}
      aria-label={localize('com_ui_conversation_label', {
        title: title || localize('com_ui_untitled'),
      })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleBlur}
      onClick={(e) => {
        if (renaming) {
          return;
        }
        if (e.button === 0) {
          handleNavigation(e.ctrlKey || e.metaKey);
        }
      }}
      onContextMenu={renaming ? undefined : handleContextMenu}
      onKeyDown={(e) => {
        if (renaming) {
          return;
        }
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigation(false);
        }
      }}
      style={{ cursor: renaming ? 'default' : 'pointer' }}
      data-testid="convo-item"
    >
      {renaming ? (
        <RenameForm
          titleInput={titleInput}
          setTitleInput={setTitleInput}
          onSubmit={submitRename}
          onCancel={cancelRename}
          localize={localize}
        />
      ) : (
        <ConvoLink
          isActiveConvo={isActiveConvo}
          isPopoverActive={isPopoverActive}
          title={title}
          onRename={handleRename}
          isSmallScreen={isSmallScreen}
          localize={localize}
        >
          {isGenerating ? (
            <svg
              className="h-5 w-5 flex-shrink-0 animate-spin text-text-primary"
              viewBox="0 0 24 24"
              fill="none"
              aria-label={localize('com_ui_generating')}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <EndpointIcon
              conversation={conversation}
              endpointsConfig={endpointsConfig}
              size={20}
              context="menu-item"
            />
          )}
        </ConvoLink>
      )}
      <div
        className={cn(
          'mr-2 flex origin-left',
          isPopoverActive || isActiveConvo
            ? 'pointer-events-auto scale-x-100 opacity-100'
            : 'pointer-events-none max-w-0 scale-x-0 opacity-0 group-focus-within:pointer-events-auto group-focus-within:max-w-[60px] group-focus-within:scale-x-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:max-w-[60px] group-hover:scale-x-100 group-hover:opacity-100',
          !isPopoverActive && isActiveConvo && isShiftHeld ? 'max-w-[60px]' : 'max-w-[28px]',
        )}
        // Removing aria-hidden to fix accessibility issue: ARIA hidden element must not be focusable or contain focusable elements
        // but not sure what its original purpose was, so leaving the property commented out until it can be cleared safe to delete.
        // aria-hidden={!(isPopoverActive || isActiveConvo)}
      >
        {/* Only render ConvoOptions when user interacts (hover/focus) or for active conversation */}
        {!renaming && (hasInteracted || isActiveConvo) && <ConvoOptions {...convoOptionsProps} />}
      </div>
    </div>
  );
}
