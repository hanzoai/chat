import React, { useCallback } from 'react';
import { TooltipAnchor, MobileSidebar, Sidebar, Button } from '@hanzochat/client';
import { CLOSE_SIDEBAR_ID, OPEN_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import BrandCorner from './BrandCorner';
import { useLocalize } from '~/hooks';

/**
 * The sidebar's first row: the mark, and the control that closes the pane. Compose
 * is deliberately NOT here — it lives in the view's header so it holds one
 * position whether the pane is open or closed.
 */
export default function NewChat({
  toggleNav,
  subHeaders,
}: {
  toggleNav: () => void;
  subHeaders?: React.ReactNode;
}) {
  const localize = useLocalize();

  const handleToggleNav = useCallback(() => {
    toggleNav();
    // Delay focus until after the sidebar animation completes (200ms)
    setTimeout(() => {
      document.getElementById(OPEN_SIDEBAR_ID)?.focus();
    }, 250);
  }, [toggleNav]);

  return (
    <>
      <div className="flex items-center justify-between px-0.5 py-[2px] md:py-2">
        {/* Top-left of the app: the Hanzo mark. It replaces the collapse button
            that used to sit here — the toggle now closes the sidebar from the
            sidebar's own right edge, which is the side it collapses toward. */}
        <BrandCorner />
        {/* The collapse toggle, and nothing else. Compose moved out to the view's
            header (HeaderNewChat), where it keeps one position at every sidebar
            state instead of jumping in and out of the pane; everything that acts
            on the open conversation lives at the top right of the view. */}
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
                className="rounded-full border-none bg-transparent duration-0 hover:bg-surface-active-alt focus-visible:ring-inset focus-visible:ring-black focus-visible:ring-offset-0 dark:focus-visible:ring-white md:rounded-xl"
                onClick={handleToggleNav}
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
      </div>
      {subHeaders != null ? subHeaders : null}
    </>
  );
}
