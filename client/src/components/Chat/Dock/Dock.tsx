import { memo } from 'react';
import { ResizableHandleAlt, ResizablePanel } from '@hanzochat/client';
import { DOCK_CARDS } from './cards';

/**
 * The dock — a resizable column beside the conversation holding a stack of
 * embedded surfaces: a live feed, a world widget, an app preview.
 *
 * It is a sibling panel in the same ResizablePanelGroup the artifacts panel
 * already uses, not a second layout system: one group owns the horizontal
 * split, so the chat, the artifacts and this all resize against each other
 * and one saved layout describes the row.
 *
 * Each card is an iframe and stays that way deliberately. A widget is somebody
 * else's page — world.hanzo.ai owns its panels — and embedding it means the
 * dock never becomes a place where those surfaces get reimplemented and drift.
 */
interface DockProps {
  defaultSize: number;
  minSizeMain: number;
}

const Dock = memo(function Dock({ defaultSize, minSizeMain }: DockProps) {
  return (
    <>
      <ResizableHandleAlt withHandle className="bg-border-medium text-text-primary" />
      <ResizablePanel
        defaultSize={defaultSize}
        minSize={minSizeMain}
        maxSize={70}
        collapsible={true}
        collapsedSize={0}
        order={3}
        id="dock-panel"
      >
        {/* No min-width. A floor wider than the panel does not widen the panel —
            it renders content PAST the panel edge, where it is clipped and
            unreachable: `min-w-[320px]` inside a 221px panel put 91px of every
            card outside it at 768, and the column never scrolled to reach it
            because the overflow was at the panel boundary, not this div
            (scrollWidth === clientWidth). Cards size to the panel; the panel's
            own minSize is what keeps it usable. */}
        <div className="h-full overflow-y-auto p-2">
          <div className="flex flex-col gap-2">
            {DOCK_CARDS.map((card) => (
              <section
                key={card.id}
                aria-label={card.label}
                className="overflow-hidden rounded-xl border border-border-medium bg-surface-primary-alt"
              >
                <header className="px-3 py-2">
                  <h3 className="text-sm font-medium text-text-primary">{card.label}</h3>
                  <p className="text-xs text-text-secondary">{card.note}</p>
                </header>
                <iframe
                  src={card.src}
                  title={card.label}
                  // `allow-same-origin` is REQUIRED and is not the footgun it
                  // looks like here. Without it the frame gets an OPAQUE origin,
                  // and a player that needs its own storage and postMessage
                  // channel — YouTube — refuses and renders nothing: measured,
                  // the card was blank while the identical video played as the
                  // backdrop, whose iframe carries no sandbox at all.
                  //
                  // The escape it is famous for needs allow-scripts AND a
                  // SAME-origin document: such a frame can reach into its parent
                  // and remove the sandbox attribute. Every card here is
                  // cross-origin by construction (frame-src enumerates the hosts,
                  // cards.spec.ts holds that), so the frame's origin is theirs,
                  // not ours, and there is nothing to reach.
                  //
                  // What stays withheld is what actually protects the page:
                  // no allow-top-navigation, so a card cannot redirect the tab
                  // out from under a conversation — and no allow-popups, which
                  // neither card needs and which frame-src does NOT govern, so
                  // a popup is the one window a compromised card could open at
                  // an origin the allowlist would otherwise have refused.
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allow="autoplay; encrypted-media"
                  loading="lazy"
                  // A frame that never loads — blocked by CSP, offline, taken
                  // down — paints its default document, which is WHITE, and a
                  // white slab in a dark column reads as a broken card rather
                  // than an absent one. `color-scheme: dark` makes the browser
                  // render that blank document dark, so a card that cannot load
                  // is quiet instead of loud. The backdrop already had this
                  // care (it stays invisible unless the player reports playing);
                  // the card did not inherit it.
                  style={{ colorScheme: 'dark' }}
                  className={
                    card.aspect === 'video'
                      ? 'block aspect-video w-full border-0'
                      : 'block h-[420px] w-full border-0'
                  }
                />
              </section>
            ))}
          </div>
        </div>
      </ResizablePanel>
    </>
  );
});

Dock.displayName = 'Dock';

export default Dock;
