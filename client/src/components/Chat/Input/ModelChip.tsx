import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocalize } from '~/hooks';

/**
 * What is answering, and the way to change it.
 *
 * It opens the picker the composer already has — `@` in an empty composer, i.e.
 * `Mention` over `useMentions` — rather than a second one of its own. That list
 * is flat and searchable and leads with the models, so the whole choice is this
 * press plus one row: two clicks, against the six it took to reach the same
 * models through Settings → Chat.
 *
 * The pill is `CheckboxButton`'s shape (the tool badges beside it) written out,
 * because this is not a toggle: it has no checked state to carry and pressing it
 * opens something rather than turning something on. Sharing the shape keeps the
 * row one row; sharing the component would mean lying about what it is.
 */
function ModelChip({ model, onOpen }: { model?: string | null; onOpen: () => void }) {
  const localize = useLocalize();
  const label = localize('com_ui_select_model');

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      title={label}
      data-testid="model-chip"
      className="group relative inline-flex max-w-[12rem] items-center justify-center gap-1.5 rounded-full border border-border-medium bg-transparent px-3 py-2 text-sm font-medium text-text-primary shadow-sm transition-all hover:bg-surface-hover hover:shadow-md active:shadow-inner"
    >
      <span className="truncate">{model ?? label}</span>
      <ChevronDown className="size-4 flex-shrink-0 opacity-60" aria-hidden="true" />
    </button>
  );
}

export default memo(ModelChip);
