import { HeaderNewChat } from './Menus';
import CanvasToggle from './Menus/CanvasToggle';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { TemporaryChat } from './TemporaryChat';
import PanelControls from './PanelControls';

export default function Header() {
  const { data: startupConfig } = useGetStartupConfig();

  return (
    /* The top bar carries NO ground of its own (owner call): no glass, no plate,
       no border — the content reads straight up through it. The darker glass
       lives only where a real surface sits: the left sidebar, the right control
       panel, and the bottom bar. The header is just its controls floating over
       whatever is behind, each button carrying its own hover ground when the
       pointer needs it (`components/chrome.ts`). */
    /* DESKTOP header only. On a phone this whole row — new chat, share,
       temporary, canvas, the panel toggle — floated over the hero as a
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

        {/* The right end carries the controls that act on THIS view and have no
            other home. Two used to sit here that did: bookmarking, which the
            conversation's own row menu already offers under the same permission
            with the same tags, and maximize, which is a switch in Settings →
            Chat and a row in the backdrop menu besides. A control with a second
            home is a second answer, and this row was invented to have one. */}
        <div className="flex items-center gap-2" data-testid="header-actions">
          <ExportAndShareMenu isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false} />
          <TemporaryChat />
          {/* The right edge's mirror of the left sidebar button: it opens the
              canvas (the artifacts panel). Shows only when there is one. */}
          <CanvasToggle />
          {/* The right panel is chrome for the WINDOW, not for the conversation,
              so it sits after every conversation action — last thing at the
              right end, the way a title bar reads. The whole row is already
              desktop-only (see the container above), so it needs no width gate
              of its own. */}
          <PanelControls />
        </div>
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}
