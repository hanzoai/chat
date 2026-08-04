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
 * A checkbox that assistive tech can SEE must be NAMED — that union is the one
 * thing this wrapper adds over the primitive: exactly one of `aria-label` /
 * `aria-labelledby`, enforced at compile time, so it cannot reach a screen
 * reader as an anonymous control.
 *
 * The third branch is the decorative case and it is not a loophole. A checkbox
 * rendered `aria-hidden` is not in the accessibility tree at all, so demanding a
 * name for it is asking for a label nothing will ever read. AutoSendPrompt is
 * the real instance: the surrounding Button carries the label and `aria-pressed`
 * and the box is a `tabIndex={-1}`, `pointer-events-none` glyph. Requiring
 * `aria-hidden: true` (not merely permitting the absence of a name) keeps the
 * escape hatch honest — you can only take it by declaring the box invisible.
 *
 * That branch is `true`, not React's `Booleanish`, because the @hanzo/ui 8.x
 * primitive types this prop as plain `boolean` — it is Tamagui-backed, not a DOM
 * element. Writing `true | 'true'` here looks more permissive and is not: it
 * intersects with the primitive's `boolean` down to `true` anyway, so the string
 * form silently stayed a type error at the only call site that needs it. Pass
 * `aria-hidden`, not `aria-hidden="true"`.
 */
export type CheckboxProps =
  | (BaseCheckboxProps & {
      'aria-label': string;
      'aria-labelledby'?: never;
      'aria-hidden'?: never;
    })
  | (BaseCheckboxProps & {
      'aria-labelledby': string;
      'aria-label'?: never;
      'aria-hidden'?: never;
    })
  | (BaseCheckboxProps & {
      'aria-hidden': true;
      'aria-label'?: never;
      'aria-labelledby'?: never;
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
