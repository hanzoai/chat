import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Globe, Maximize2, Minimize2, Monitor, SlidersHorizontal } from 'lucide-react';
import { Button, DropdownPopup, TooltipAnchor } from '@hanzochat/client';
import type { MenuItemProps } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const buttonClass =
  'rounded-xl bg-presentation duration-0 hover:bg-surface-active-alt aria-expanded:bg-surface-active-alt';

/**
 * The window controls at the right end of the header: width, companions, right
 * panel. Each one owns a persisted atom and nothing else — the panels read the
 * same atoms, so a toggle here and a toggle inside a panel are one control.
 *
 * `SlidersHorizontal` rather than `PanelRight` for the right-hand panel: the
 * neighbouring `CanvasToggle` already carries `PanelRight` for the ARTIFACTS
 * panel, and two buttons in one row wearing one glyph name neither. This panel
 * calls itself Controls in its own `aria-label`, which is what the sliders say.
 */
export default function PanelControls() {
  const localize = useLocalize();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [maximized, setMaximized] = useAtom(store.maximizeChatSpace);
  const [sidePanelOpen, setSidePanelOpen] = useAtom(store.sidePanelOpen);
  const bottomBarOpen = useAtomValue(store.bottomBarOpen);
  const openBottomBarTab = useSetAtom(store.openBottomBarTab);

  const toggleSideChat = useCallback(() => setSidePanelOpen((v) => !v), [setSidePanelOpen]);
  const newBottomBarTab = useCallback(() => openBottomBarTab(), [openBottomBarTab]);

  /**
   * The app's shortcuts. A document listener in an effect is how this repo
   * registers keys (there is no hotkey library); `e.code` rather than `e.key`
   * because Option+S on macOS types "ß" and would never match a letter test.
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

  const items: MenuItemProps[] = useMemo(
    () => [
      {
        id: 'companion-side-chat',
        label: localize('com_ui_side_chat'),
        icon: <SlidersHorizontal className="size-4" />,
        kbd: '⌥⌘S',
        onClick: toggleSideChat,
      },
      {
        id: 'companion-browser',
        label: localize('com_ui_browser'),
        icon: <Globe className="size-4" />,
        kbd: '⌘T',
        onClick: newBottomBarTab,
      },
    ],
    [localize, toggleSideChat, newBottomBarTab],
  );

  const maximizeLabel = localize('com_nav_maximize_chat_space');
  const sidePanelLabel = localize(sidePanelOpen ? 'com_ui_close_var' : 'com_ui_open_var', {
    0: localize('com_nav_control_panel'),
  });

  return (
    <>
      <TooltipAnchor
        description={maximizeLabel}
        render={
          <Button
            size="icon"
            variant="outline"
            data-testid="maximize-chat-space"
            aria-label={maximizeLabel}
            aria-pressed={maximized}
            className={cn(buttonClass, maximized && 'bg-surface-active-alt')}
            onClick={() => setMaximized(!maximized)}
          >
            {maximized ? (
              <Minimize2 className="icon-md" aria-hidden="true" />
            ) : (
              <Maximize2 className="icon-md" aria-hidden="true" />
            )}
          </Button>
        }
      />
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        isOpen={menuOpen}
        unmountOnHide={true}
        setIsOpen={setMenuOpen}
        placement="bottom-end"
        className="min-w-52"
        itemClassName="min-h-11"
        items={items}
        trigger={
          <TooltipAnchor
            description={localize('com_ui_companions')}
            render={
              <Ariakit.MenuButton
                id="companions-menu-button"
                data-testid="companions-menu"
                aria-label={localize('com_ui_companions')}
                className={cn(
                  'inline-flex size-10 flex-shrink-0 items-center justify-center border border-border-light text-text-primary',
                  buttonClass,
                  bottomBarOpen && 'bg-surface-active-alt',
                )}
              >
                <Monitor className="icon-md" aria-hidden="true" />
              </Ariakit.MenuButton>
            }
          />
        }
      />
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
            <SlidersHorizontal className="icon-md" aria-hidden="true" />
          </Button>
        }
      />
    </>
  );
}
