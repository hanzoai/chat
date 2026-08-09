import { PermissionTypes, Permissions } from '@hanzochat/data-provider';
import { HeaderNewChat } from './Menus';
import CanvasToggle from './Menus/CanvasToggle';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import PanelControls from './PanelControls';
import { useHasAccess, useLocalize } from '~/hooks';

export default function Header() {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  return (
    /* The top bar is the app's glass — the blur alone, with no opaque plate over
       it (owner call: the solid `bg-surface-primary-alt` band read too heavy at
       the top of the page). Its boundary is the hairline `border-b`, not a filled
       ground, so the row still has a bottom edge — it does not blend upward into
       the browser's own chrome the way a boundary-less gradient once did — while
       the conversation shows through the blur behind it. The ground belongs to
       the BAR, never the buttons: one row, one material (`components/chrome.ts`). */
    <div className="glass absolute top-0 z-10 flex h-14 w-full items-center justify-between border-b border-border-light p-2 font-semibold text-text-primary">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center">
          {/* New chat lives here now — right of the sidebar, with the controls
              that act on the open conversation — so the sidebar head is just
              the mark and the collapse toggle. No model pill (enso by default;
              model choice is in Settings). */}
          <HeaderNewChat />
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
          {/* The window controls (width, companions, right panel) are chrome for
              the WINDOW, not for the conversation, so they sit after every
              conversation action — last thing at the right end, the way a title
              bar reads. */}
          <PanelControls />
        </div>
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}
