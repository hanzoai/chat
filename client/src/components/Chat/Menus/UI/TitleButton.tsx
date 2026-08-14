import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PopoverTrigger } from '@hanzo/ui/primitives/PopoverTrigger';
import { useLocalize } from '~/hooks';

export default function TitleButton({ primaryText = '', secondaryText = '' }) {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    /* `except-style` rather than a bare `asChild`. gui merges its own View
     * styles onto the slotted child, and that View is a flex COLUMN — the label
     * and the chevron would stand on top of each other. Radix's trigger
     * contributed no styles, so withholding them is what keeps this button as
     * it was. The attributes still arrive: `data-state` (what
     * `radix-state-open:` selects on) and `aria-expanded` are not style props,
     * and the child is a host element so gui's `onPress` is remapped to
     * `onClick` on the way through. */
    <PopoverTrigger asChild="except-style">
      <button
        className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-lg font-medium transition-colors duration-200 hover:bg-surface-hover radix-state-open:bg-surface-hover"
        aria-label={localize('com_ui_endpoint_menu')}
        aria-expanded={isExpanded}
        role="combobox"
        aria-haspopup="listbox"
        aria-controls="llm-endpoint-menu"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <span className="text-text-primary"> {primaryText} </span>
          {!!secondaryText && <span className="text-token-text-secondary">{secondaryText}</span>}
        </div>
        <ChevronDown className="text-token-text-secondary size-4" aria-hidden="true" />
      </button>
    </PopoverTrigger>
  );
}
