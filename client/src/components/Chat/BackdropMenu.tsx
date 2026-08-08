import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { merge } from '~/utils/backdrop';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * Right-click the canvas to change what is behind the conversation.
 *
 * The menu opens ONLY over empty backdrop — a right-click on a message, the
 * composer, a link or any control keeps that element's own menu (copy, paste,
 * open-in-new-tab), because those are where a context menu is expected to do
 * its usual thing. It writes the same `backdrop` atom the Settings panel and
 * the `/bg` commands do, through the same `merge` — one background, one way to
 * change it, three ways to reach it.
 */
const INTERACTIVE =
  'input, textarea, select, button, a, [contenteditable="true"], [role="textbox"], [role="menu"], .message-render';

function Item({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-active-alt focus:outline-none focus-visible:bg-surface-active-alt"
    >
      {children}
    </button>
  );
}

export default function BackdropMenu({ children }: { children: React.ReactNode }) {
  const localize = useLocalize();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [backdrop, setBackdrop] = useAtom(store.backdrop);
  const [maximize, setMaximize] = useAtom(store.maximizeChatSpace);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    if ((event.target as Element).closest(INTERACTIVE)) {
      return;
    }
    event.preventDefault();
    // Clamp into the viewport so a click near the edge doesn't open offscreen.
    const x = Math.min(event.clientX, window.innerWidth - 240);
    const y = Math.min(event.clientY, window.innerHeight - 240);
    setAt({ x: Math.max(8, x), y: Math.max(8, y) });
  }, []);

  useEffect(() => {
    if (!at) {
      return;
    }
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAt(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [at]);

  const change = (c: Record<string, unknown>) => {
    setBackdrop(merge(backdrop, c));
    setAt(null);
  };
  const ask = (kind: 'video' | 'photo') => {
    setAt(null);
    const url = window.prompt(
      kind === 'video'
        ? localize('com_backdrop_ask_video')
        : localize('com_backdrop_ask_photo'),
    );
    if (url && url.trim()) {
      change(kind === 'video' ? { source: 'video', video: url.trim() } : { source: 'photo', photo: url.trim() });
    }
  };

  const off = backdrop.source === 'off';

  return (
    <div className="contents" onContextMenu={onContextMenu}>
      {children}
      {at && (
        <div
          role="menu"
          aria-label={localize('com_backdrop_menu')}
          className="fixed z-[200] min-w-56 rounded-xl border border-border-medium bg-surface-primary p-1 text-sm text-text-primary shadow-lg"
          style={{ left: at.x, top: at.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Item onClick={() => ask('video')}>{localize('com_backdrop_set_video')}</Item>
          <Item onClick={() => ask('photo')}>{localize('com_backdrop_set_photo')}</Item>
          <Item onClick={() => change({ source: off ? 'video' : 'off' })}>
            {off ? localize('com_backdrop_on') : localize('com_backdrop_off')}
          </Item>
          {!off && (
            <Item onClick={() => change({ loop: !backdrop.loop })}>
              {backdrop.loop ? localize('com_backdrop_loop_off') : localize('com_backdrop_loop_on')}
            </Item>
          )}
          <div className="my-1 h-px bg-border-light" />
          <Item
            onClick={() => {
              setMaximize(!maximize);
              setAt(null);
            }}
          >
            {maximize ? localize('com_backdrop_view_focused') : localize('com_backdrop_view_wide')}
          </Item>
        </div>
      )}
    </div>
  );
}
