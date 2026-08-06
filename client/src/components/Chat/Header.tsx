import { useRef } from 'react';
import { TooltipAnchor, Button } from '@hanzochat/client';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HanzoMark } from '@hanzogui/shell';
import { PermissionTypes, Permissions } from '@hanzochat/data-provider';
import type { ContextType } from '~/common';
import { HeaderNewChat } from './Menus';
import CanvasToggle from './Menus/CanvasToggle';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import { useHasAccess, useLocalize } from '~/hooks';

export default function Header() {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const { navVisible, setNavVisible } = useOutletContext<ContextType>();

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  // Hover-intent open: moving onto the brand corner while the sidebar is
  // collapsed slides it open after a short delay, so a cursor passing through
  // the corner on its way elsewhere does not fling the whole nav open. The
  // click still opens it instantly; this only adds the hover affordance the
  // corner used to hint at with a second (space-reserving) toggle button.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openOnHover = () => {
    if (navVisible) {
      return;
    }
    hoverTimer.current = setTimeout(() => setNavVisible(true), 160);
  };
  const cancelHover = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  return (
    <div className="via-presentation/70 md:from-presentation/80 md:via-presentation/50 2xl:from-presentation/0 absolute top-0 z-10 flex h-14 w-full items-center justify-between bg-gradient-to-b from-presentation to-transparent p-2 font-semibold text-text-primary 2xl:via-transparent">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center">
          {/* The brand corner appears here ONLY while the sidebar is collapsed,
              because that is the only time this header owns the app's top-left
              corner — with the sidebar open the mark lives in its first row.
              One component, one corner, never two marks on screen. Below md the
              corner is not this header's either way: the phone bar (MobileNav)
              carries the mark and the menu, so this cluster is desktop chrome. */}
          <AnimatePresence initial={false}>
            {!navVisible && (
              <motion.div
                className="group flex items-center gap-1 max-md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                key="header-buttons"
                onMouseEnter={openOnHover}
                onMouseLeave={cancelHover}
              >
                {/* Collapsed, the mark IS the way back in — hover the corner to
                    slide the sidebar open, or click to open it now. It sits
                    directly beside New (gap-1, no reserved space between them):
                    the old opacity-0 expand toggle wedged an invisible button in
                    that slot, so the corner read as a broken gap. One mark, one
                    corner, no ghost control. */}
                <TooltipAnchor
                  description={localize('com_nav_open_sidebar')}
                  render={
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={localize('com_nav_open_sidebar')}
                      aria-controls="chat-history-nav"
                      className="rounded-xl bg-presentation duration-0 hover:bg-surface-active-alt"
                      onClick={() => setNavVisible(true)}
                    >
                      <span className="flex items-center justify-center text-text-primary">
                        <HanzoMark size={18} />
                      </span>
                    </Button>
                  }
                />
                <HeaderNewChat />
              </motion.div>
            )}
          </AnimatePresence>
          {/* No model pill and no multi-convo control on the left edge (owner
              call): the model is enso by default and the picker was chrome
              stating a name at the arrival screen. Model choice lives in
              Settings; the left edge is the mark and nothing else. */}
        </div>

        {/* The right end of the header is where every control that acts on THIS
            view lives — presets, bookmarks, share, temporary. They used to be
            split by width, the same two components written twice under opposite
            conditions, with presets and bookmarks crowding the left edge beside
            the mark and the model. One end, one copy, every width: the left edge
            is the app's identity and the model it is talking to, nothing else. */}
        <div className="flex items-center gap-2" data-testid="header-actions">
          {hasAccessToBookmarks === true && <BookmarkMenu />}
          <ExportAndShareMenu isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false} />
          <TemporaryChat />
          {/* The right edge's mirror of the left sidebar button: it opens the
              canvas (the artifacts panel). Shows only when there is one. */}
          <CanvasToggle />
        </div>
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}
