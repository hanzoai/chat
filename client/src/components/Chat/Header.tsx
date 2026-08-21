import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import Sources from './Menus/CanvasToggle';
import { TemporaryChat } from './TemporaryChat';
import ConvoMenu from './Menus/ConvoMenu';
import Share from './ExportAndShareMenu';

/**
 * The header asks one question and offers four answers about the thread under
 * it. Nothing else.
 *
 *   [ Medium ⌄ ]                 [ share ] [ files ] [ ⋯ ] [ private ]
 *
 * Both ends are named (`header-lead`, `header-actions`) so the contract can be
 * read as MEMBERSHIP rather than as a list of absences. A test that queries for
 * a control the header does not import can never fail — the module is gone, so
 * the marker was never going to render either way — and a row defended only by
 * absences drifts without anything going red.
 *
 * WHAT LEFT, and why each was a second answer rather than a feature:
 *
 * - New chat, DELETED rather than unmounted: the sidebar is a rail when
 *   collapsed, so its own compose button never leaves the screen, and this was
 *   a second one beside it at every width above md. Nothing imported it by
 *   name — only the `Menus` barrel re-exported it, which is what made it look
 *   reachable.
 * - The window controls (width, companions, right panel). Chrome for the
 *   WINDOW, not for the conversation, and the panel they reach is now one
 *   surface with its own control two seats to the left. `Chat/PanelControls`
 *   is still on disk and is not deleted here: it also owns this app's only
 *   keyboard shortcuts, so removing it is a decision about those, not about
 *   this row.
 * - The preset menu and the endpoint menu, which are gone from the app rather
 *   than moved: see `Menus/Endpoints/ModelSelector`.
 *
 * WHAT ARRIVED: the effort control. It had been pushed into Settings on the
 * theory that the house default is right and asking on every turn is noise.
 * That was true of the picker that existed — endpoint, then model, then
 * preset — and it is not true of one adjective. Someone who wants a longer
 * think on one hard question should not have to open Settings to get it.
 *
 * Share and `⋯` appear once the conversation exists on the server; files and
 * sources appears once the assistant has made something; private hides itself
 * once the thread has a message in it, because it decides what the NEXT
 * conversation is. So an empty thread reads [effort] [private] and a working
 * one reads [effort] [share] [files] [⋯] — the row never shows a control that
 * would do nothing.
 *
 * The row carries no ground of its own: no glass, no plate, no border. The
 * darker glass lives only where a real surface sits — the left sidebar and the
 * bottom bar. Each button brings its own hover ground (`components/chrome.ts`).
 *
 * DESKTOP only. On a phone this row floated over the hero as a cluster of icons
 * a thumb had no use for, on top of the phone's own top bar (`Nav/MobileNav`,
 * which owns new chat and the drawer below md). It stays in the DOM — the
 * header contract reads presence, not visibility.
 */
export default function Header() {
  const { data: startupConfig } = useGetStartupConfig();

  return (
    <div className="absolute top-0 z-10 hidden h-14 w-full items-center justify-between px-2 py-1.5 font-semibold text-text-primary md:flex">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center" data-testid="header-lead">
          <ModelSelector startupConfig={startupConfig} />
        </div>

        <div className="flex items-center gap-2" data-testid="header-actions">
          <Share enabled={startupConfig?.sharedLinksEnabled ?? false} />
          <Sources />
          <ConvoMenu />
          <TemporaryChat />
        </div>
      </div>
    </div>
  );
}
