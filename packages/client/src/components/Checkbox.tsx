import * as React from 'react';
import { Checkbox as GuiCheckbox } from '@hanzo/ui/primitives/Checkbox';
import { cn } from '~/utils';

type BaseCheckboxProps = Omit<
  React.ComponentProps<typeof GuiCheckbox>,
  'aria-label' | 'aria-labelledby'
> & {
  asChild?: boolean;
};

/**
 * A checkbox must be NAMED — that union is the one thing this wrapper adds over
 * the primitive. Exactly one of `aria-label` / `aria-labelledby` is required at
 * compile time, so an unlabelled checkbox cannot reach a screen reader as an
 * anonymous control.
 */
export type CheckboxProps =
  | (BaseCheckboxProps & {
      'aria-label': string;
      'aria-labelledby'?: never;
    })
  | (BaseCheckboxProps & {
      'aria-labelledby': string;
      'aria-label'?: never;
    });

/**
 * @hanzo/ui owns everything visual — the 16px box, the border, the tick, the
 * 44px touch floor — so the old wrapper's size/colour/focus-ring utilities are
 * gone.
 *
 * `peer` is NOT decoration and does not go with them. Call sites pair this with
 * a sibling label carrying `peer-disabled:opacity-70` /
 * `peer-disabled:cursor-not-allowed` (ExportModal, Endpoints/Settings/Advanced);
 * Tailwind's `peer-*` variants only resolve against an element that declares
 * `peer`. Drop it and those labels silently stop dimming when the checkbox is
 * disabled — a change with no error and no failing test.
 */
const Checkbox = ({ className, ...props }: CheckboxProps) => (
  <GuiCheckbox {...props} className={cn('peer', className)} />
);

export { Checkbox };
