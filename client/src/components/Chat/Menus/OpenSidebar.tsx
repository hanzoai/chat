import { PanelLeft } from 'lucide-react';
import { TooltipAnchor, Button } from '@hanzochat/client';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/** Element ID for the close sidebar button - used for focus management */
export const CLOSE_SIDEBAR_ID = 'close-sidebar-button';
/** Element ID for the open sidebar button - used for focus management */
export const OPEN_SIDEBAR_ID = 'open-sidebar-button';

/**
 * The left sidebar's toggle, for the surfaces that carry their own chrome row.
 *
 * It has always toggled; `navVisible` is what lets it SAY so. Callers that only
 * mount it while the sidebar is closed leave it out and get the open wording,
 * which is the state they mount it in.
 *
 * The CHAT view does not mount this: there the sidebar collapses to a rail that
 * keeps its own toggle (`Nav/NewChat.tsx`), so a copy in `Chat/Header.tsx`
 * would be a second control for one panel. `Chat/Header.spec.tsx` holds that.
 */
export default function OpenSidebar({
  navVisible = false,
  setNavVisible,
  className,
}: {
  navVisible?: boolean;
  setNavVisible: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) {
  const localize = useLocalize();
  const label = localize(navVisible ? 'com_nav_close_sidebar' : 'com_nav_open_sidebar');

  const handleClick = () => {
    // Urgent, and persisted by the atom — see Nav.toggleNavVisible.
    setNavVisible((prev) => !prev);
    // Delay focus until after the sidebar animation completes (200ms)
    setTimeout(() => {
      document.getElementById(CLOSE_SIDEBAR_ID)?.focus();
    }, 250);
  };

  return (
    <TooltipAnchor
      description={label}
      render={
        <Button
          id={OPEN_SIDEBAR_ID}
          size="icon"
          variant="outline"
          data-testid="open-sidebar-button"
          aria-label={label}
          aria-expanded={navVisible}
          aria-controls="chat-history-nav"
          className={cn(CONTROL, className)}
          onClick={handleClick}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
      }
    />
  );
}
