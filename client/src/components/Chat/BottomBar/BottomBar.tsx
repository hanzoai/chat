import { memo, useCallback, useMemo } from 'react';
import throttle from 'lodash/throttle';
import { useAtomValue, useSetAtom } from 'jotai';
import { Globe, Plus, X } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import Preview from '~/components/SidePanel/Preview/Panel';
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
        'flex max-w-44 shrink items-center gap-1 rounded-lg pr-1 text-sm',
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
        className="flex min-w-0 items-center gap-1.5 rounded-lg py-1.5 pl-2 text-text-primary"
      >
        <Globe className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={() => closeTab(id)}
        aria-label={localize('com_ui_close_var', { 0: label })}
        className="flex size-5 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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

  return (
    <ResizablePanel
      id="bottom-bar"
      order={2}
      defaultSize={size}
      minSize={MIN_BAR}
      className="flex min-h-0 flex-col border-t border-border-light bg-surface-primary-alt"
    >
      <div
        role="tablist"
        aria-label={localize('com_ui_bottom_bar')}
        className="flex items-center gap-1 border-b border-border-light px-1 py-1"
      >
        {tabs.map((id) => (
          <BottomBarTab key={id} id={id} active={id === active} />
        ))}
        <button
          type="button"
          onClick={() => openTab()}
          data-testid="bottom-bar-new-tab"
          aria-label={localize('com_ui_bottom_bar_new_tab')}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
      {open && <ResizableHandle withHandle />}
      {open && <BottomBar />}
    </ResizablePanelGroup>
  );
}

export default memo(BottomBarGroup);
