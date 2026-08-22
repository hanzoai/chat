import { useCallback, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import store from '~/store';

/**
 * The app's keyboard shortcuts, and the ONE place they are registered.
 *
 * ⌥⌘S toggles the right panel; ⌘T opens the bottom bar.
 *
 * They used to live inside `Chat/PanelControls`, beside the button that drew the
 * right-panel toggle — so a binding that belongs to the WINDOW was owned by a
 * control that belongs to a ROW. When the header's window controls were removed
 * as a second answer to what the panels already offer, the bindings went with
 * them: PanelControls stayed on disk and stopped being rendered, and an effect in
 * an unmounted component registers nothing.
 *
 * The bottom bar felt that hardest. `BottomBarGroup` renders `{open && <BottomBar/>}`,
 * so the bar's own `+` and tab controls exist only once it is already open — ⌘T
 * and the companions menu were the only two ways IN, and both were in
 * PanelControls. The bar was mounted and unreachable.
 *
 * A document listener in an effect is how this repo registers keys — there is no
 * hotkey library — and `e.code` rather than `e.key`, because Option+S on macOS
 * types "ß" and would never match a letter test.
 */
export default function useShortcuts() {
  const setSidePanelOpen = useSetAtom(store.sidePanelOpen);
  const openBottomBarTab = useSetAtom(store.openBottomBarTab);

  const toggleSidePanel = useCallback(() => setSidePanelOpen((v) => !v), [setSidePanelOpen]);
  const newBottomBarTab = useCallback(() => openBottomBarTab(), [openBottomBarTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        toggleSidePanel();
      } else if (!e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        newBottomBarTab();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleSidePanel, newBottomBarTab]);
}
