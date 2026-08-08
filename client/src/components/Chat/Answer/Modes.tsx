import type { SearchMode } from '@hanzo/ai';
import type { TranslationKeys } from '~/hooks';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

/**
 * The landing's mode switch — the ONE place the answer modes are named and
 * rendered. `chat` hands the input to the normal conversation flow; the rest
 * ground the question on the live web.
 *
 * Text, not chips. The selected mode used to be a filled lozenge, which made the
 * loudest object on the landing a label saying which of three modes you were
 * already in — above a composer that is the actual subject of the screen. It is
 * a switch between four words; it should read as four words. Selected is the
 * foreground colour plus a hairline under the label, unselected is the secondary
 * colour, and neither carries a fill or a border.
 *
 * The weight does NOT change with selection: `font-medium` on the active label
 * re-measures the text and shoves its neighbours sideways every time you switch.
 * Colour and the rule underneath carry the state without moving anything.
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

export default function Modes({
  mode,
  setMode,
}: {
  mode: SearchMode | 'chat';
  setMode: (m: SearchMode | 'chat') => void;
}) {
  const localize = useLocalize();
  const { isGuest } = useAuthContext();

  return (
    <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODES.filter((m) => !isGuest || GUEST_MODES.has(m.id)).map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => setMode(m.id)}
          className="group inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy"
        >
          {/* No underline (owner call): the selected mode is carried by colour
              alone. */}
          <span
            className={cn(
              'py-0.5 transition-colors',
              mode === m.id
                ? 'text-text-primary'
                : 'text-text-secondary group-hover:text-text-primary',
            )}
          >
            {localize(m.key)}
          </span>
        </button>
      ))}
    </div>
  );
}
