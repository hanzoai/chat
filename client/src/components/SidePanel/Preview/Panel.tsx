import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
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
 * It is the body of a TAB, and its URL is keyed by that tab's id, so two tabs
 * are two pages. It serves two hosts and adds a column to neither:
 *
 *   - a bottom-bar tab, which passes its generated id and resizes and closes
 *     with the bar;
 *   - the right side panel, one of that panel's pages, which passes nothing and
 *     gets the reserved id below.
 *
 * The panel was refused here once, and the reason was that a panel of its own
 * would need its own size, its own open state and its own toggle — a third
 * movable column for the reader to manage. The side panel is not that: it
 * already HAS a size, an open state and a toggle, and it already holds seven
 * other pages. Being one more of them costs no column, which is exactly the
 * objection, answered rather than overruled.
 *
 * The reserved id cannot collide with a bar tab's: those are
 * `<base36 time>-<random>` and this one is a word.
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
 *
 * A REFUSAL IS A STATE, NOT A BLANK RECTANGLE. `frame-src` (api/server/csp.js)
 * names the only origins this page may frame, so most URLs a reader types are
 * refused — and a refused frame loads `about:blank`, keeps its full box, and
 * says nothing outside the devtools console. `blocked` below is that refusal,
 * caught rather than guessed: the browser dispatches `securitypolicyviolation`
 * on the document with `blockedURI` = the refused ORIGIN, which is an exact
 * answer and not a heuristic. Measured in Chromium: an inaccessible-document
 * test cannot work here at all — the sandbox gives EVERY frame an opaque
 * origin, so a loaded page and a refused one are byte-identical from out here;
 * and a timing test cannot either, since a same-origin page loads in the same
 * ~3ms a refusal takes. `useLayoutEffect`, not `useEffect`: the event is
 * dispatched in a task shortly after the frame is inserted (a listener attached
 * after two rAFs misses it), and a layout effect runs synchronously in the
 * commit that inserts it.
 *
 * This detects the refusals THIS page makes. A site that answers
 * `X-Frame-Options: DENY` refuses from its own side, fires nothing here, and
 * cannot be detected from the embedder — under the current `frame-src` no such
 * URL can reach the frame anyway, so nothing pretends to catch it.
 */
/** The side panel's own page — see above. */
const PANEL = 'panel';

export default function Preview({ tabId = PANEL }: { tabId?: string }) {
  const localize = useLocalize();
  const [url, setUrl] = useAtom(store.preview(tabId));
  const [draft, setDraft] = useState(url);
  /** Bumped to remount the frame — a same-src reload is not a prop change. */
  const [generation, setGeneration] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const src = useMemo(() => framable(url), [url]);
  const rejected = url !== '' && src === null;
  /** `framable` returns an absolute http(s) URL, so this never throws. */
  const origin = useMemo(() => (src === null ? null : new URL(src).origin), [src]);

  useLayoutEffect(() => {
    setBlocked(false);
    if (origin === null) {
      return;
    }
    const onViolation = (event: SecurityPolicyViolationEvent) => {
      // `violatedDirective` carries the whole source list in older engines;
      // `effectiveDirective` is the bare name. Either starts with the name.
      const directive = event.effectiveDirective || event.violatedDirective;
      if (event.blockedURI === origin && directive.startsWith('frame-src')) {
        setBlocked(true);
      }
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    return () => document.removeEventListener('securitypolicyviolation', onViolation);
  }, [origin, generation]);

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

  /* The URL and the way out of the frame, written once. It rides above the
     frame while a page can be shown, and INSIDE the refusal otherwise — where
     the reader is already looking — so the address never appears twice. */
  const outbound =
    src === null ? null : (
      <a
        href={src}
        target="_blank"
        rel="noreferrer noopener"
        className="flex max-w-full items-center gap-1 truncate px-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <SquareArrowOutUpRight className="icon-xs shrink-0" aria-hidden="true" />
        <span className="truncate">{src}</span>
      </a>
    );

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

      {!blocked && outbound}

      {/* `min-h-0` so the frame shrinks with the bar instead of pushing the URL
          row off the top — a flex child's default min-height is its content. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border-light bg-surface-primary">
        {src !== null && !blocked ? (
          <iframe
            key={`${src}#${generation}`}
            src={src}
            title={localize('com_sidepanel_preview')}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="h-full w-full border-0"
          />
        ) : (
          <div
            data-testid="preview-state"
            className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-text-secondary"
          >
            {blocked ? (
              <>
                <p>{localize('com_sidepanel_preview_blocked')}</p>
                {outbound}
              </>
            ) : (
              <p>
                {rejected
                  ? localize('com_sidepanel_preview_refused')
                  : localize('com_sidepanel_preview_empty')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
