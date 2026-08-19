import { memo, useCallback, useMemo } from 'react';
import throttle from 'lodash/throttle';
import { useAtomValue, useSetAtom } from 'jotai';
import { Globe, Plus, X } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import Preview from '~/components/SidePanel/Preview/Panel';
import { CHROME_RADIUS, FOCUS_RING, STRIP_BUTTON, TAB_CLOSE } from '../chrome';
import { cn } from '~/utils';
import store from '~/store';

/**
 * The bottom bar — a tab strip of framed pages UNDER the conversation.
 *
 * Not to be confused with `Chat/Dock`, which is a column of embedded cards
 * BESIDE the conversation and is a different feature entirely: that one is a
 * sibling panel in the horizontal group, fed by a fixed card list; this one is
 * a horizontal split of the chat column that the reader fills themselves, one
 * URL per tab. Two panels, two axes, two names.
 */

/** Percent of the chat column. Below this the URL row has nowhere to sit. */
const MIN_BAR = 15;
/** Percent of the chat column the conversation always keeps. */
const MIN_CHAT = 30;

/** The host of a framed page, which is what a tab is recognised by. */
function tabLabel(url: string, fallback: string): string {
  if (!url) {
    return fallback;
  }
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).hostname || fallback;
  } catch {
    return url;
  }
}

const BottomBarTab = memo(function BottomBarTab({ id, active }: { id: string; active: boolean }) {
  const localize = useLocalize();
  const url = useAtomValue(store.preview(id));
  const setActive = useSetAtom(store.bottomBarActiveTab);
  const closeTab = useSetAtom(store.closeBottomBarTab);
  const label = tabLabel(url, localize('com_ui_browser'));

  /* The tab and its close button are SIBLINGS, not nested: a button inside a
     button is invalid, and a nested one would swallow the tab's own activation. */
  return (
    <div
      className={cn(
        'flex max-w-44 shrink items-center gap-1 pr-1 text-sm',
        CHROME_RADIUS,
        active ? 'bg-surface-active-alt' : 'hover:bg-surface-hover',
      )}
    >
      <button
        type="button"
        role="tab"
        id={`bottom-bar-tab-${id}`}
        aria-selected={active}
        aria-controls="bottom-bar-tabpanel"
        tabIndex={active ? 0 : -1}
        onClick={() => setActive(id)}
        className={cn(
          'flex min-w-0 items-center gap-1.5 py-1.5 pl-2 text-text-primary',
          CHROME_RADIUS,
          FOCUS_RING,
        )}
      >
        <Globe className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
      {/* `-mx-0.5` is a BLEED, not spacing: the box grew 20 → 24 so the pointer
          has something to hit, and the negative margin gives back the 4px so
          the tab is the same width it was. The 2px it overhangs on each side
          land inside the tab's own `gap-1` and `pr-1`, never outside its box. */}
      <button
        type="button"
        onClick={() => closeTab(id)}
        data-testid={`bottom-bar-tab-close-${id}`}
        aria-label={localize('com_ui_close_var', { 0: label })}
        className={cn(
          'flex shrink-0 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          TAB_CLOSE,
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
});

const BottomBar = memo(function BottomBar() {
  const localize = useLocalize();
  const tabs = useAtomValue(store.bottomBarTabs);
  const active = useAtomValue(store.bottomBarActiveTab);
  const size = useAtomValue(store.bottomBarSize);
  const setOpen = useSetAtom(store.bottomBarOpen);
  const openTab = useSetAtom(store.openBottomBarTab);

  /* No `border-t` on the panel: the seam is the resize handle's own 1px rule,
     and this painted a second one directly under it — two stacked hairlines
     reading as one thick, blurry edge. One seam, one rule, and it belongs to
     the thing you can grab. */
  return (
    <ResizablePanel
      id="bottom-bar"
      order={2}
      defaultSize={size}
      minSize={MIN_BAR}
      className="flex min-h-0 flex-col bg-surface-primary-alt"
    >
      <div
        role="tablist"
        aria-label={localize('com_ui_bottom_bar')}
        className="flex items-center gap-1 border-b border-border-light px-1 py-1"
      >
        {tabs.map((id) => (
          <BottomBarTab key={id} id={id} active={id === active} />
        ))}
        {/* 40px, bled back into the strip's own `py-1`, so the pointer target
            grows from 28 while the strip's height does not: the box now spans
            the strip's padding edge to edge, which is the largest square that
            fits without pushing the conversation up. It cannot reach 44 without
            overhanging the drag handle above and stealing the grab. */}
        <button
          type="button"
          onClick={() => openTab()}
          data-testid="bottom-bar-new-tab"
          aria-label={localize('com_ui_bottom_bar_new_tab')}
          className={cn(
            'flex shrink-0 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            STRIP_BUTTON,
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          data-testid="bottom-bar-close"
          aria-label={localize('com_ui_bottom_bar_close')}
          aria-expanded={true}
          aria-controls="bottom-bar"
          className={cn(
            'flex shrink-0 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            STRIP_BUTTON,
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div
        role="tabpanel"
        id="bottom-bar-tabpanel"
        aria-labelledby={active ? `bottom-bar-tab-${active}` : undefined}
        className="min-h-0 flex-1"
      >
        {active ? (
          <Preview key={active} tabId={active} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            {localize('com_ui_bottom_bar_empty')}
          </div>
        )}
      </div>
    </ResizablePanel>
  );
});

/**
 * The chat column with the bottom bar under it.
 *
 * The group is mounted whether or not the bar is open, so toggling the bar
 * never remounts the conversation — only the handle and the bar panel come and
 * go. `minSize` on the chat panel is what keeps the composer on screen: the bar
 * takes height from the column, it does not float over it.
 */
function BottomBarGroup({ children }: { children: React.ReactNode }) {
  const open = useAtomValue(store.bottomBarOpen);
  const setSize = useSetAtom(store.bottomBarSize);

  const saveSize = useMemo(
    () =>
      throttle((sizes: number[]) => {
        if (sizes.length === 2) {
          setSize(sizes[1]);
        }
      }, 350),
    [setSize],
  );

  const onLayout = useCallback((sizes: number[]) => saveSize(sizes), [saveSize]);

  return (
    <ResizablePanelGroup direction="vertical" onLayout={onLayout} className="h-full w-full">
      {/* No className: the panel is a plain block box, so `<main>` fills its
          width exactly as it did before the bar existed. Making it a flex row
          instead shrink-to-fits the conversation to its content — measured at
          626px inside a 1439px column. */}
      <ResizablePanel id="chat-column" order={1} minSize={MIN_CHAT}>
        {children}
      </ResizablePanel>
      {/* The seam paints ONE rule — the handle's own 1px line — under an 8px
          grab band centred on it, and carries no mark of its own. No
          `withHandle`: the grip chip it renders sits in the middle of that
          band, so `elementFromPoint` across the seam returned the chip's
          `<svg>`/`<circle>` at three of five probes rather than the handle. A
          1px rule does not need a second thing to aim at on top of it.
          `FOCUS_RING` because the handle is focusable and its own
          `ring-1 ring-offset-1` computed to a fully transparent, zero-width
          shadow — a keyboard user resizing the bar had no indicator at all. */}
      {open && <ResizableHandle className={FOCUS_RING} />}
      {open && <BottomBar />}
    </ResizablePanelGroup>
  );
}

export default memo(BottomBarGroup);
