import { createStore } from 'jotai';
import store from '~/store';

/**
 * The bottom bar's tab list, tested at the store rather than through the DOM,
 * because every affordance that touches it — the strip's `+`, the companions
 * menu, ⌘T, a tab's `×` — goes through these two write-only atoms. Testing the
 * atoms tests all four; testing one button would test one button.
 *
 * The bar is NOT `Chat/Dock`. That is the column of embedded cards beside the
 * conversation, with its own `store.showDock` Settings switch. Nothing here
 * reads or writes it, and this test says so out loud so the two do not merge.
 */
describe('the bottom bar tab list', () => {
  beforeEach(() => localStorage.clear());

  it('opens a tab, focuses it, and opens the bar with it', () => {
    const s = createStore();
    expect(s.get(store.bottomBarOpen)).toBe(false);

    s.set(store.openBottomBarTab);

    const tabs = s.get(store.bottomBarTabs);
    expect(tabs).toHaveLength(1);
    expect(s.get(store.bottomBarActiveTab)).toBe(tabs[0]);
    expect(s.get(store.bottomBarOpen)).toBe(true);
  });

  it('gives each tab its own page', () => {
    const s = createStore();
    s.set(store.openBottomBarTab);
    s.set(store.openBottomBarTab);
    const [first, second] = s.get(store.bottomBarTabs);

    s.set(store.preview(first), 'example.com');

    expect(s.get(store.preview(first))).toBe('example.com');
    expect(s.get(store.preview(second))).toBe('');
  });

  it('moves focus to the neighbour when the focused tab closes', () => {
    const s = createStore();
    s.set(store.openBottomBarTab);
    s.set(store.openBottomBarTab);
    s.set(store.openBottomBarTab);
    const [first, second, third] = s.get(store.bottomBarTabs);
    s.set(store.bottomBarActiveTab, second);

    s.set(store.closeBottomBarTab, second);

    expect(s.get(store.bottomBarTabs)).toEqual([first, third]);
    expect(s.get(store.bottomBarActiveTab)).toBe(third);
  });

  it('leaves the bar open and empty when the last tab closes', () => {
    const s = createStore();
    s.set(store.openBottomBarTab);
    const [only] = s.get(store.bottomBarTabs);

    s.set(store.closeBottomBarTab, only);

    expect(s.get(store.bottomBarTabs)).toEqual([]);
    expect(s.get(store.bottomBarActiveTab)).toBe('');
    /* The strip's `×` closes the bar. A tab's `×` closes a tab and nothing
       else — a control must not silently do a second, larger thing. */
    expect(s.get(store.bottomBarOpen)).toBe(true);
  });

  it('takes the closed tab’s page out of storage rather than blanking it', () => {
    const s = createStore();
    s.set(store.openBottomBarTab);
    const [id] = s.get(store.bottomBarTabs);
    s.set(store.preview(id), 'example.com');
    expect(localStorage.getItem(`panel:bottom-url:${id}`)).toBe('"example.com"');

    s.set(store.closeBottomBarTab, id);

    // Not `'""'`: a long session must not silt localStorage up with dead tabs.
    expect(localStorage.getItem(`panel:bottom-url:${id}`)).toBeNull();
  });

  /**
   * The bytes in localStorage are not ours — a previous release, an extension,
   * a devtools console — and `tabs.map` on a non-array throws during render.
   *
   * Re-imported per case on purpose: `atomWithLocalStorage` passes
   * `getOnInit`, so the first read happens when the MODULE is evaluated. A
   * `localStorage.setItem` after that reaches an atom that has already read.
   */
  it.each([
    ['an object', '{"not":"an array"}', []],
    ['non-strings among the ids', '["ok", 7, null]', ['ok']],
    ['not JSON at all', 'undefined', []],
  ])('ignores %s left in the tab list', (_name, stored, expected) => {
    localStorage.setItem('panel:bottom-tabs', stored);
    jest.isolateModules(() => {
      const fresh = require('~/store').default as typeof store;
      expect(createStore().get(fresh.bottomBarTabs)).toEqual(expected);
    });
  });
});
