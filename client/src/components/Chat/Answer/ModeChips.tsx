import type { SearchMode } from '@hanzo/ai';
import type { TranslationKeys } from '~/hooks';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

/**
 * The landing's mode switch — the ONE place the answer modes are named and
 * rendered. `chat` hands the input to the normal conversation flow; the rest
 * ground the question on the live web.
 *
 * Mobile-first: the row scrolls horizontally at 390px rather than wrapping.
 */

/** Modes, in the order they read as escalating effort. */
const MODES = [
  { id: 'chat', key: 'com_answer_mode_chat' },
  { id: 'search', key: 'com_answer_mode_search' },
  { id: 'news', key: 'com_answer_mode_news' },
  // No 'deep'. It was research with the dials up -- same system prompt, same
  // models, same gate -- so it offered a choice that was really an intensity, and
  // hid its 2x price behind an adjective. Cloud folded the two into one research
  // mode (apps/answer/mode.go) which always does the deeper pass; 'deep' still
  // RESOLVES there for any client that has not shipped this, so nothing 400s.
  { id: 'research', key: 'com_answer_mode_research' },
] as const satisfies readonly { id: SearchMode | 'chat'; key: TranslationKeys }[];

/**
 * Modes a guest may run. Research gathers a far wider source set and runs
 * far longer on a SHARED balance, so the relay refuses them for a guest
 * (`GUEST_MODES` in api/server/routes/ask.js — that is the authority). Filtering
 * here keeps a guest from walking into a refusal.
 */
const GUEST_MODES = new Set<string>(['chat', 'search', 'news']);

export default function ModeChips({
  mode,
  setMode,
}: {
  mode: SearchMode | 'chat';
  setMode: (m: SearchMode | 'chat') => void;
}) {
  const localize = useLocalize();
  const { isGuest } = useAuthContext();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODES.filter((m) => !isGuest || GUEST_MODES.has(m.id)).map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => setMode(m.id)}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 py-1.5 text-sm transition-colors',
            // Selected is a step UP the surface ladder with a full-strength
            // label — not a white lozenge. The white one read as the loudest
            // thing on the page while only saying which of three modes you were
            // already in.
            mode === m.id
              ? 'bg-surface-active font-medium text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover',
          )}
        >
          {localize(m.key)}
        </button>
      ))}
    </div>
  );
}
