import React, { useCallback } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { TooltipAnchor, MobileSidebar, Sidebar, Button } from '@hanzochat/client';
import { CLOSE_SIDEBAR_ID, OPEN_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import BrandCorner from './BrandCorner';
import Mark from './Mark';
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
  pinned,
}: {
  toggleNav: () => void;
  /**
   * Is the sidebar PINNED open — as opposed to merely drawn open because a
   * pointer is resting on the rail?
   *
   * The two are different questions and the toggle answers only this one. It
   * used to read `collapsed`, which is about how wide the column is DRAWN, and
   * that was fine while the only way to be wide was to be pinned. Once the rail
   * peeks on hover it stopped being fine in the sharpest possible way: hovering
   * the rail widened it, the head swapped to the expanded branch, and the
   * button under the pointer changed from "Open sidebar" to "Close sidebar"
   * before the click landed. Open became unreachable — the pointer's arrival
   * was what destroyed the control it was arriving at.
   *
   * So the head follows `pinned` and only the body below it follows the drawn
   * width: unpinned — rail or peek — the head is the mark, offering "Open",
   * because opening is exactly what is left to do.
   */
  pinned?: boolean;
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
      {/* THE HEAD DOES NOT MOVE WHEN THE RAIL PEEKS.
          It keys on `pinned`, and it is pinned to the rail's own 56px box while
          unpinned, so the mark sits at the same x and y whether the column is
          drawn 56 wide or 260. Everything below — destinations, search, the
          list, the foot — is free to widen, because none of it is what the
          pointer is travelling towards.

          Keying this on `collapsed` instead put a moving target under an
          arriving pointer: hovering the rail widened the column, the head
          swapped to the expanded branch, and the control the pointer was aimed
          at was replaced by a different element ~200px to the right, mid-flight.
          Measured — the click landed on nothing and the sidebar never opened.
          That is the same class of defect that got hover-to-expand thrown out
          of this repo once already; it does not come back through the head. */}
      <div
        className={cn(
          'flex',
          pinned === false
            ? 'w-14 flex-col items-center gap-0.5 py-2'
            : 'items-center justify-between px-0.5 py-[2px] md:py-2',
        )}
      >
        {pinned === false ? (
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
                    the way back to the panel. Pointing at the mark reveals
                    `PanelLeftOpen` — a left panel opening to the RIGHT — so a
                    collapsed rail shows the way it will EXPAND, not a static
                    panel that reads the same shut as open. The tooltip says it
                    in words for anyone who never hovers. Both marks share ONE
                    18px box, stacked, so the swap moves no pixel. */}
                <span className="relative flex size-5 items-center justify-center text-text-primary">
                  <span className="flex transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
                    <Mark />
                  </span>
                  <PanelLeftOpen
                    aria-hidden="true"
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </span>
              </Button>
            }
          />
        ) : (
          <BrandCorner />
        )}
        {pinned === false ? null : (
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
