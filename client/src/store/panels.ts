import { atom } from 'jotai';
import { RESET } from 'jotai/utils';
import { atomWithLocalStorage } from './utils';
import { preview } from './preview';

/**
 * Which chrome panels are open, and how tall the bottom bar is.
 *
 * One persisted atom per panel, so the header's toggles, the panels themselves
 * and the keyboard shortcuts all read and write the SAME value. The right-hand
 * panel used to keep its open state in `SidePanelGroup`'s React state (plus
 * three localStorage keys), which is why nothing outside that subtree could
 * toggle it — the header can now, because there is one place to ask.
 *
 * NOT here: `store.showDock`, which belongs to the side dock (`Chat/Dock`, the
 * column of embedded cards beside the conversation). That is a Settings switch
 * for a different panel and stays in `store/settings.ts` with the rest of them.
 */

/** The right-hand control panel. */
export const sidePanelOpen = atomWithLocalStorage('panel:side', false);

/** The bottom bar — the tab strip of framed pages under the conversation. */
export const bottomBarOpen = atomWithLocalStorage('panel:bottom', false);

/** Tab ids, in strip order. Each tab frames its own page. */
export const bottomBarTabs = atomWithLocalStorage<string[]>('panel:bottom-tabs', [], (value) =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [],
);

/** The focused tab's id; '' when the bar has no tabs. */
export const bottomBarActiveTab = atomWithLocalStorage('panel:bottom-active', '');

/** The bar's share of the chat column, as a percentage of its height. */
export const bottomBarSize = atomWithLocalStorage('panel:bottom-size', 35, (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100 ? value : 35,
);

/**
 * Open a new tab and focus it — the one way a tab is created, shared by the
 * companion menu, ⌘T and the strip's `+`.
 */
export const openBottomBarTab = atom(null, (get, set) => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  set(bottomBarTabs, [...get(bottomBarTabs), id]);
  set(bottomBarActiveTab, id);
  set(bottomBarOpen, true);
});

/**
 * Close one tab. Focus moves to its neighbour; closing the last tab leaves an
 * empty bar rather than closing it, because the strip's `×` is what closes the
 * bar and a tab's `×` must not silently do a second, larger thing.
 */
export const closeBottomBarTab = atom(null, (get, set, id: string) => {
  const tabs = get(bottomBarTabs);
  const index = tabs.indexOf(id);
  if (index === -1) {
    return;
  }
  const remaining = tabs.filter((tab) => tab !== id);
  set(bottomBarTabs, remaining);
  if (get(bottomBarActiveTab) === id) {
    set(bottomBarActiveTab, remaining[Math.min(index, remaining.length - 1)] ?? '');
  }
  /* The tab's page goes with the tab. RESET removes the key rather than storing
     '' under it, so a long session cannot silt localStorage up with dead tabs. */
  set(preview(id), RESET);
  preview.remove(id);
});
