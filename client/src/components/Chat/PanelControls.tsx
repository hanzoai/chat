import { useCallback, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { Button, TooltipAnchor } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import { CONTROL } from '~/components/chrome';
import { cn } from '~/utils';
import store from '~/store';

const buttonClass = CONTROL;

/**
 * The window control at the right end of the header: the right panel. It owns a
 * persisted atom the panel itself reads too, so a toggle here and a toggle
 * inside the panel are one control.
 *
 * Maximize is no longer one of them. `maximizeChatSpace` already had a switch in
 * Settings → Chat and a row in the backdrop menu, so the header button was the
 * third control for one boolean — and the only one of the three that spent a
 * seat in the row.
 *
 * The right panel wears `PanelRight` — the mirror of the left sidebar's
 * `PanelLeft`. One rail on each edge, one glyph pointing at each, so the two
 * ends of the row read as the same idea reflected; open, it flips to
 * `PanelRightClose`, exactly as the left toggle and the canvas toggle do. The
 * canvas toggle shares the family because it, too, opens a right-edge panel —
 * the tooltip names which one.
 *
 * ⌘T still opens the bottom bar (the framed-page strip under the conversation);
 * it no longer has a header button, so the shortcut is its opener.
 */
export default function PanelControls() {
  const localize = useLocalize();
  const [sidePanelOpen, setSidePanelOpen] = useAtom(store.sidePanelOpen);
  const openBottomBarTab = useSetAtom(store.openBottomBarTab);

  const toggleSideChat = useCallback(() => setSidePanelOpen((v) => !v), [setSidePanelOpen]);
  const newBottomBarTab = useCallback(() => openBottomBarTab(), [openBottomBarTab]);

  /**
   * The app's shortcuts. A document listener in an effect is how this repo
   * registers keys (there is no hotkey library); `e.code` rather than `e.key`
   * because Option+S on macOS types "ß" and would never match a letter test.
   * ⌥S toggles the right panel; ⌘T opens the bottom bar.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        toggleSideChat();
      } else if (!e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        newBottomBarTab();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleSideChat, newBottomBarTab]);

  const sidePanelLabel = localize(sidePanelOpen ? 'com_ui_close_var' : 'com_ui_open_var', {
    0: localize('com_nav_control_panel'),
  });

  return (
    <TooltipAnchor
      description={sidePanelLabel}
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="toggle-side-panel"
          aria-label={sidePanelLabel}
          aria-expanded={sidePanelOpen}
          aria-controls="controls-nav"
          className={cn(buttonClass, sidePanelOpen && 'bg-surface-active-alt')}
          onClick={toggleSideChat}
        >
          {sidePanelOpen ? <PanelRightClose aria-hidden="true" /> : <PanelRight aria-hidden="true" />}
        </Button>
      }
    />
  );
}
