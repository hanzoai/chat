import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import { TemporaryChat } from './TemporaryChat';
import ConvoMenu from './Menus/ConvoMenu';
import Share from './ExportAndShareMenu';

/**
 * The header asks one question and offers three answers about the thread under
 * it. Nothing else.
 *
 *   [ model ]                                    [ share ] [ ⋯ ] [ private ]
 *
 * WHAT LEFT, and why each was a second answer rather than a feature:
 *
 * - New chat. The sidebar is a rail when collapsed, so its own compose button
 *   never leaves the screen. Two buttons that start a conversation, side by
 *   side, at every width above md.
 * - The canvas toggle and the window controls. The right panel is ONE surface
 *   now and it is the canvas's own; a toggle for it belongs with the panel it
 *   opens, not in the row that names the model. Both components are still on
 *   disk and neither is deleted here — where the canvas opens from is the
 *   canvas's call, not this row's.
 * - The preset menu and the endpoint menu, which are gone from the app, not
 *   moved: see `Menus/Endpoints/ModelSelector`.
 *
 * WHAT ARRIVED: the model. It had been pushed into Settings on the theory that
 * the house default is right and asking on every turn is noise. That is true of
 * a picker that asks "which endpoint, then which model, then which preset" — and
 * it is not true of a name. A person who wants a longer think on one hard
 * question should not have to open Settings to get it.
 *
 * Share and `⋯` appear once the conversation exists on the server; private
 * hides itself once it has a message in it, because it decides what the NEXT
 * conversation is. So an empty thread reads [model] [private] and a live one
 * reads [model] [share] [⋯] — the row never shows a control that would do
 * nothing.
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
        <div className="mx-1 flex items-center">
          <ModelSelector startupConfig={startupConfig} />
        </div>

        <div className="flex items-center gap-2" data-testid="header-actions">
          <Share enabled={startupConfig?.sharedLinksEnabled ?? false} />
          <ConvoMenu />
          <TemporaryChat />
        </div>
      </div>
    </div>
  );
}
