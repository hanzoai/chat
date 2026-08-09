import React, { useCallback } from 'react';
import { HanzoMark } from '@hanzogui/shell';
import { TooltipAnchor, MobileSidebar, Sidebar, Button } from '@hanzochat/client';
import { CLOSE_SIDEBAR_ID, OPEN_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import BrandCorner from './BrandCorner';
import { useLocalize } from '~/hooks';
import { CONTROL } from '~/components/chrome';
import { cn } from '~/utils';

/**
 * The head of the sidebar: the corner and the toggle between the two widths.
 *
 * Collapsed the sidebar is a narrow rail rather than a panel pushed off screen,
 * so the mark IS the way back in; its app-switcher self (`BrandCorner`) owns the
 * corner the moment the sidebar opens, and the phone bar carries it at every
 * width below md. Compose is not here in either state — it belongs to the view
 * header, which spans the width beside this rail at every width.
 */
export default function NewChat({
  toggleNav,
  subHeaders,
  collapsed,
}: {
  toggleNav: () => void;
  collapsed?: boolean;
  subHeaders?: React.ReactNode;
}) {
  const localize = useLocalize();

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
                className={cn(CONTROL, 'group')}
                onClick={() => toggleThenFocus(CLOSE_SIDEBAR_ID)}
              >
                {/* Brand at rest, affordance on point. The rail has exactly one
                    slot, and it owes the eye two things: whose app this is, and
                    the way back to the panel. Pointing at the mark reveals the
                    canonical PanelLeft, so the slot answers both without ever
                    showing two shapes at once — and the tooltip says it in
                    words for anyone who never hovers. Both marks share ONE 18px
                    box, stacked, so the swap moves no pixel. */}
                <span className="relative flex size-5 items-center justify-center text-text-primary">
                  <span className="flex transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
                    <HanzoMark size={20} />
                  </span>
                  <Sidebar className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </span>
              </Button>
            }
          />
        ) : (
          <BrandCorner />
        )}
        {collapsed === true ? null : (
          /* The sidebar head is the mark and the collapse toggle, nothing else
             (owner call). Compose lives in the view header, right of the
             sidebar, because it acts on the open conversation.

             The COLLAPSED rail used to keep a compose of its own, on the
             reasoning that a rail has no header beside it to hold one. It does:
             Chat/Header spans the width right of the rail and renders
             HeaderNewChat at every width, so collapsing the rail produced two
             New chat buttons on screen at once — measured at 768 and at every
             desktop width above it. One end, one copy, every width. */
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
                  className={CONTROL}
                  onClick={() => toggleThenFocus(OPEN_SIDEBAR_ID)}
                >
                  <Sidebar aria-hidden="true" className="max-md:hidden" />
                  <MobileSidebar
                    aria-hidden="true"
                    className="m-1 inline-flex items-center justify-center md:hidden"
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
