import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HanzoMark } from '@hanzogui/shell';
import { QueryKeys } from '@hanzochat/data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { TooltipAnchor, NewChatIcon, MobileSidebar, Sidebar, Button } from '@hanzochat/client';
import { CLOSE_SIDEBAR_ID, OPEN_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import BrandCorner from './BrandCorner';
import { useLocalize, useNewConvo } from '~/hooks';
import { clearMessagesCache, cn } from '~/utils';
import store from '~/store';

/** The one button ground the sidebar's head uses, in both of its states. */
const TAP =
  'rounded-full border-none bg-transparent duration-0 hover:bg-surface-active-alt focus-visible:ring-inset focus-visible:ring-black focus-visible:ring-offset-0 dark:focus-visible:ring-white md:rounded-xl';

/**
 * The head of the sidebar: the corner, compose, and the toggle between the two
 * widths.
 *
 * Collapsed the sidebar is a narrow rail rather than a panel pushed off screen,
 * so this head keeps its controls and stacks them in the column instead of
 * laying them across a row — which is the whole reason compose sits BELOW the
 * mark there and beside it here. Collapsed the mark IS the way back in; its
 * app-switcher self (`BrandCorner`) owns the corner the moment the sidebar
 * opens, and the phone bar carries it at every width below md.
 */
export default function NewChat({
  index = 0,
  toggleNav,
  subHeaders,
  isSmallScreen,
  collapsed,
}: {
  index?: number;
  toggleNav: () => void;
  isSmallScreen?: boolean;
  collapsed?: boolean;
  subHeaders?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  /** Note: this component needs an explicit index passed if using more than one */
  const { newConversation: newConvo } = useNewConvo(index);
  const navigate = useNavigate();
  const localize = useLocalize();
  const { conversation } = store.useCreateConversationAtom(index);

  /** Focus follows the toggle to whichever control replaced it, once the 200ms
      width transition has finished. */
  const toggleThenFocus = useCallback(
    (id: string) => {
      toggleNav();
      setTimeout(() => {
        document.getElementById(id)?.focus();
      }, 250);
    },
    [toggleNav],
  );

  const clickHandler: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
        window.open('/c/new', '_blank');
        return;
      }
      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);
      newConvo();
      navigate('/c/new', { state: { focusChat: true } });
      if (isSmallScreen) {
        toggleNav();
      }
    },
    [queryClient, conversation, newConvo, navigate, toggleNav, isSmallScreen],
  );

  const compose = (
    <TooltipAnchor
      description={localize('com_ui_new_chat')}
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="nav-new-chat-button"
          aria-label={localize('com_ui_new_chat')}
          className={TAP}
          onClick={clickHandler}
        >
          <NewChatIcon className="icon-lg text-text-primary" />
        </Button>
      }
    />
  );

  return (
    <>
      <div
        className={cn(
          'flex',
          collapsed === true
            ? 'flex-col items-center gap-0.5 py-2'
            : 'items-center justify-between px-0.5 py-[2px] md:py-2',
        )}
      >
        {collapsed === true ? (
          <TooltipAnchor
            description={localize('com_nav_open_sidebar')}
            render={
              <Button
                id={OPEN_SIDEBAR_ID}
                size="icon"
                variant="outline"
                data-testid="open-sidebar-button"
                aria-label={localize('com_nav_open_sidebar')}
                aria-expanded={false}
                aria-controls="chat-history-nav"
                className={TAP}
                onClick={() => toggleThenFocus(CLOSE_SIDEBAR_ID)}
              >
                <span className="flex items-center justify-center text-text-primary">
                  <HanzoMark size={18} />
                </span>
              </Button>
            }
          />
        ) : (
          <BrandCorner />
        )}
        {collapsed === true ? (
          compose
        ) : (
          /* Expanded, the sidebar head is the mark and the collapse toggle,
             nothing else (owner call). Compose moved OUT to the view header,
             right of the sidebar — it acts on the open conversation, which is
             where those controls live. The collapsed RAIL keeps compose, since
             the rail has no header beside it to hold one. */
          <div className="flex items-center gap-0.5">
            <TooltipAnchor
              description={localize('com_nav_close_sidebar')}
              render={
                <Button
                  id={CLOSE_SIDEBAR_ID}
                  size="icon"
                  variant="outline"
                  data-testid="close-sidebar-button"
                  aria-label={localize('com_nav_close_sidebar')}
                  aria-expanded={true}
                  aria-controls="chat-history-nav"
                  className={TAP}
                  onClick={() => toggleThenFocus(OPEN_SIDEBAR_ID)}
                >
                  <Sidebar aria-hidden="true" className="max-md:hidden" />
                  <MobileSidebar
                    aria-hidden="true"
                    className="icon-lg m-1 inline-flex items-center justify-center md:hidden"
                  />
                </Button>
              }
            />
          </div>
        )}
      </div>
      {subHeaders != null ? subHeaders : null}
    </>
  );
}
