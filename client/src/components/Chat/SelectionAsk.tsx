import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { useSubmitMessage, useLocalize } from '~/hooks';

/**
 * Highlight something in a reply, ask about just that.
 *
 * Select text inside a message and a small "Ask" button appears at the
 * selection; clicking it opens a popup that quotes what you highlighted and
 * takes a follow-up. The follow-up is sent into THIS conversation — the answer
 * lands inline in the thread, so exploring a concept and continuing the chat
 * are the same motion, not a side panel you have to reconcile later.
 *
 * It is one floating overlay for the whole thread (not a control per message):
 * it reads the live selection, so it only ever acts on the words under the
 * cursor. Selections outside a message are ignored — this is for asking about
 * an answer, not about the composer or the chrome.
 */

const MAX_QUOTE = 300;

type Anchor = { x: number; y: number; below: boolean; text: string };

export default function SelectionAsk() {
  const localize = useLocalize();
  const { submitMessage } = useSubmitMessage();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  // A ref, not the state, guards read(): the mouseup fired by clicking "Ask"
  // runs a queued read on the SAME tick the popup opens, and a state read there
  // is the pre-click value — which would re-read (and can clear) the anchor out
  // from under the popup. The ref is current the instant asking flips.
  const askingRef = useRef(false);
  const openAsk = useCallback(() => {
    askingRef.current = true;
    setAsking(true);
  }, []);

  const dismiss = useCallback(() => {
    askingRef.current = false;
    setAnchor(null);
    setAsking(false);
    setQuestion('');
  }, []);

  // The current selection, but only when it lies inside a message. Reading it on
  // mouseup (not selectionchange) means the button appears once the drag ends,
  // not while the text is still being swept.
  const read = useCallback(() => {
    if (askingRef.current) {
      return;
    }
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!sel || sel.rangeCount === 0 || text.length < 2) {
      setAnchor(null);
      return;
    }
    const node = sel.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    if (!el || !el.closest('.message-render')) {
      setAnchor(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    // Above the selection by default; below it when the selection sits too near
    // the top of the viewport for the popup to fit (a reply at the top of the
    // thread would otherwise anchor the popup off-screen).
    const below = rect.top < 160;
    setAnchor({
      x: Math.min(Math.max(12, rect.left + rect.width / 2), window.innerWidth - 12),
      y: below ? rect.bottom + 8 : Math.max(12, rect.top - 8),
      below,
      text: text.length > MAX_QUOTE ? `${text.slice(0, MAX_QUOTE)}…` : text,
    });
  }, []);

  useEffect(() => {
    const onUp = () => setTimeout(read, 0);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        // A mousedown outside the overlay clears a stale button — but never
        // while the popup is open (that is what click-away is for, handled by
        // the send/Escape paths and a new selection, not a stray click).
        if (!askingRef.current) {
          setAnchor(null);
        }
      }
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [read, dismiss]);

  const send = () => {
    const q = question.trim();
    if (!q || !anchor) {
      return;
    }
    // The quote is context, the question is the turn — folded into one message
    // the conversation answers in place.
    submitMessage({ text: `Regarding this:\n\n> ${anchor.text}\n\n${q}` });
    dismiss();
    window.getSelection()?.removeAllRanges();
  };

  if (!anchor) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`fixed z-[120] -translate-x-1/2 ${anchor.below ? '' : '-translate-y-full'}`}
      style={{ left: anchor.x, top: anchor.y }}
      // Keep the text selected while interacting with the overlay.
      onMouseDown={(e) => e.preventDefault()}
    >
      {!asking ? (
        <button
          type="button"
          data-testid="selection-ask-button"
          onClick={openAsk}
          className="flex items-center gap-1.5 rounded-full border border-border-medium bg-surface-primary px-3 py-1.5 text-sm font-medium text-text-primary shadow-lg transition-colors hover:bg-surface-active-alt"
        >
          <Sparkles className="icon-sm" aria-hidden="true" />
          {localize('com_ui_ask_about_this')}
        </button>
      ) : (
        <div className="w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-border-medium bg-surface-primary p-3 shadow-xl">
          <div className="mb-2 max-h-16 overflow-y-auto border-l-2 border-border-heavy pl-2 text-xs italic text-text-secondary">
            {anchor.text}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              autoFocus
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={localize('com_ui_ask_followup')}
              data-testid="selection-ask-input"
              className="max-h-28 flex-1 resize-none rounded-lg border border-border-light bg-surface-secondary px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy"
            />
            <button
              type="button"
              onClick={send}
              disabled={!question.trim()}
              aria-label={localize('com_ui_ask_send')}
              className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-submit text-white transition-colors hover:bg-surface-submit-hover disabled:opacity-40"
            >
              <ArrowUp className="icon-sm" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
