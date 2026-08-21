import { memo } from 'react';
import { MemoryPanel } from '~/components/SidePanel/Memories';
import { useLocalize } from '~/hooks';

/**
 * What the assistant knows about you, and what it does with it.
 *
 * Memory is the whole of it today, and it is the REAL memory surface rather
 * than a second one: `MemoryPanel` already carries the list, the filter, the
 * create dialog, the usage badge and the reference-saved-memories switch. This
 * tab used to hold a hand-rolled copy of that switch — two controls writing one
 * preference, which is one too many — so the copy is gone and the panel came
 * here from the side panel, where a person looking for a setting never was.
 *
 * The panel answers for itself when a deployment turns memory off or a role
 * cannot read it, so nothing is gated twice.
 *
 * Custom instructions belong beside it and cannot be written yet: a user record
 * carries `personalization.memories` and nothing else, so the field, the route
 * and the mutation have to exist before there is anything to save.
 */
function Personalization() {
  const localize = useLocalize();

  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <div className="border-b border-border-medium pb-3">
        <div className="text-base font-semibold">{localize('com_ui_memory')}</div>
      </div>
      <MemoryPanel />
    </div>
  );
}

export default memo(Personalization);
