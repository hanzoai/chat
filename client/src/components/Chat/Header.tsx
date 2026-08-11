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
    /* The top bar carries NO ground of its own (owner call): no glass, no plate,
       no border — the content reads straight up through it. The darker glass
       lives only where a real surface sits: the left sidebar, the right control
       panel, and the bottom bar. The header is just its controls floating over
       whatever is behind, each button carrying its own hover ground when the
       pointer needs it (`components/chrome.ts`). */
    /* DESKTOP header only. On a phone this whole row — new chat, bookmarks,
       share, temporary, canvas, the window chrome — floated over the hero as a
       cluster of icons a thumb had no use for, on top of the phone's own top bar
       (`Nav/MobileNav`, which owns new chat and the drawer below md). A phone
       wants the composer in focus, not a title bar; new chat and search live one
       tap away in the drawer. So the row is `hidden` below md and unchanged from
       md up. It stays in the DOM (the header-contract spec reads presence, not
       visibility). */
    <div className="absolute top-0 z-10 hidden h-14 w-full items-center justify-between p-2 font-semibold text-text-primary md:flex">
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
              bar reads. The whole row is already desktop-only (see the container
              above), so these need no width gate of their own. */}
          <PanelControls />
        </div>
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}
