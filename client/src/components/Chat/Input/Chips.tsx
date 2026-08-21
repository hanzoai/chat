import { useEffect, useMemo } from 'react';
import { Code, Globe, X } from 'lucide-react';
import { MCPIcon } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import { useBadgeRowContext } from '~/Providers';

/**
 * The tools this turn is carrying, as chips you can take back off.
 *
 * A tool chosen in the `+` menu has to be visible afterwards or the turn goes
 * out carrying something nobody can see. A chip is the smallest thing that
 * says it: the tool's name, and one way to remove it.
 *
 * Backspace with the caret at the head of the field removes the last chip —
 * the gesture that already removes the thing to the left of the caret, applied
 * to the thing that is actually to the left of the caret. It costs nothing:
 * Backspace at offset zero does nothing otherwise.
 *
 * This is not the old badge row. That row drew every tool the deployment had,
 * lit or unlit, with a pin per tool and a mode for rearranging them; it was a
 * control surface. This draws only what is ON.
 */
export default function Chips({
  textAreaRef,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const localize = useLocalize();
  const { webSearch, codeInterpreter, mcpServerManager } = useBadgeRowContext();
  const { mcpValues, toggleServerSelection } = mcpServerManager;

  const chips = useMemo(() => {
    const on: { id: string; label: string; icon: React.ReactNode; off: () => void }[] = [];
    if (webSearch.isToolEnabled) {
      on.push({
        id: 'chip-search',
        label: localize('com_ui_web_search'),
        icon: <Globe className="size-3.5" aria-hidden="true" />,
        off: () => webSearch.debouncedChange({ value: false }),
      });
    }
    if (codeInterpreter.isToolEnabled) {
      on.push({
        id: 'chip-code',
        label: 'Write code',
        icon: <Code className="size-3.5" aria-hidden="true" />,
        off: () => codeInterpreter.debouncedChange({ value: false }),
      });
    }
    for (const server of mcpValues ?? []) {
      on.push({
        id: `chip-mcp-${server}`,
        label: server,
        icon: <MCPIcon className="size-3.5" aria-hidden="true" />,
        off: () => toggleServerSelection(server),
      });
    }
    return on;
  }, [webSearch, codeInterpreter, mcpValues, toggleServerSelection, localize]);

  useEffect(() => {
    const field = textAreaRef.current;
    if (!field || chips.length === 0) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' || field.selectionStart !== 0 || field.selectionEnd !== 0) {
        return;
      }
      e.preventDefault();
      chips[chips.length - 1].off();
    };
    /** Capture: the field's own handler submits and resizes; this runs first. */
    field.addEventListener('keydown', onKeyDown, true);
    return () => field.removeEventListener('keydown', onKeyDown, true);
  }, [chips, textAreaRef]);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 px-4 pt-2.5"
      role="list"
      aria-label={localize('com_ui_tools')}
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          role="listitem"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-xs text-text-primary"
        >
          {chip.icon}
          <span className="max-w-[12rem] truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={chip.off}
            className="-mr-1 rounded-full p-0.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}
