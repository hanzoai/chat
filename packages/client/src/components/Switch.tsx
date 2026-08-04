import * as React from 'react';
import { Switch as GuiSwitch } from '@hanzo/ui/primitives/Switch';
import { cn } from '~/utils';

type BaseSwitchProps = Omit<
  React.ComponentProps<typeof GuiSwitch>,
  'aria-label' | 'aria-labelledby'
>;

/**
 * Like Checkbox: a switch must be NAMED, and requiring exactly one of
 * `aria-label` / `aria-labelledby` at compile time is what this wrapper is for.
 */
type SwitchProps =
  | (BaseSwitchProps & {
      'aria-label': string;
      'aria-labelledby'?: never;
    })
  | (BaseSwitchProps & {
      'aria-labelledby': string;
      'aria-label'?: never;
    });

/**
 * @hanzo/ui paints the 36x20 track, the 16px thumb, the checked/unchecked
 * colours and the 44px touch floor, and it moves the thumb itself — so the old
 * wrapper's track geometry, `data-[state=*]` colour rules and the manual
 * `translate-x-5` thumb transform are all gone with it.
 *
 * `peer` stays for the same reason as on Checkbox: sibling labels use
 * `peer-disabled:*`, which only resolves against an element declaring `peer`.
 */
const Switch = ({ className, ...props }: SwitchProps) => (
  <GuiSwitch {...props} className={cn('peer', className)} />
);

export { Switch };
