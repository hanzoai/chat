import { useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { RotateCw, SquareArrowOutUpRight, X } from 'lucide-react';
import { Button, TooltipAnchor } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import { framable } from '~/utils/preview';
import store from '~/store';

/**
 * Preview — a page held beside the conversation, in a frame that cannot reach
 * chat.
 *
 * It is the body of ONE BOTTOM-BAR TAB, not a panel of its own: it resizes with
 * the bar, closes with the bar, and its URL is keyed by the tab id so two tabs
 * are two pages. A panel of its own would need its own size, its own open state
 * and its own toggle, and the reader would have a third movable column.
 *
 * THE SANDBOX IS THE POINT. `allow-scripts` without `allow-same-origin` gives
 * the framed document an OPAQUE origin: scripts run, so a real page renders,
 * but they can read neither chat's cookies and storage nor the parent DOM.
 * Granting both together would be the same as granting nothing — a document
 * served from another origin could then reach in and drop its own sandbox.
 * `allow-forms` and `allow-popups` are what make a page usable rather than a
 * screenshot; `allow-top-navigation` is NOT granted, so the frame cannot
 * replace hanzo.chat in the tab. `referrerPolicy="no-referrer"` keeps the
 * conversation's URL from travelling to whatever is being previewed.
 */
export default function Preview({ tabId }: { tabId: string }) {
  const localize = useLocalize();
  const [url, setUrl] = useAtom(store.preview(tabId));
  const [draft, setDraft] = useState(url);
  /** Bumped to remount the frame — a same-src reload is not a prop change. */
  const [generation, setGeneration] = useState(0);

  const src = useMemo(() => framable(url), [url]);
  const rejected = url !== '' && src === null;

  const open = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setUrl(draft);
    },
    [draft, setUrl],
  );

  const clear = useCallback(() => {
    setDraft('');
    setUrl('');
  }, [setUrl]);

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <form onSubmit={open} className="flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          data-testid="preview-url"
          aria-label={localize('com_sidepanel_preview_url')}
          placeholder={localize('com_sidepanel_preview_url')}
          className="h-9 w-full min-w-0 rounded-xl border border-border-light bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-border-heavy focus:outline-none"
        />
        <TooltipAnchor
          description={localize('com_ui_refresh')}
          render={
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={src === null}
              data-testid="preview-reload"
              aria-label={localize('com_ui_refresh')}
              className="shrink-0 rounded-xl border-none bg-transparent hover:bg-surface-active-alt"
              onClick={() => setGeneration((n) => n + 1)}
            >
              <RotateCw className="icon-md" />
            </Button>
          }
        />
        <TooltipAnchor
          description={localize('com_ui_clear')}
          render={
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={url === ''}
              data-testid="preview-clear"
              aria-label={localize('com_ui_clear')}
              className="shrink-0 rounded-xl border-none bg-transparent hover:bg-surface-active-alt"
              onClick={clear}
            >
              <X className="icon-md" />
            </Button>
          }
        />
      </form>

      {src !== null && (
        <a
          href={src}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 truncate px-1 text-xs text-text-secondary hover:text-text-primary"
        >
          <SquareArrowOutUpRight className="icon-xs shrink-0" aria-hidden="true" />
          <span className="truncate">{src}</span>
        </a>
      )}

      {/* `min-h-0` so the frame shrinks with the bar instead of pushing the URL
          row off the top — a flex child's default min-height is its content. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border-light bg-surface-primary">
        {src !== null ? (
          <iframe
            key={`${src}#${generation}`}
            src={src}
            title={localize('com_sidepanel_preview')}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-text-secondary">
            {rejected
              ? localize('com_sidepanel_preview_refused')
              : localize('com_sidepanel_preview_empty')}
          </div>
        )}
      </div>
    </div>
  );
}
