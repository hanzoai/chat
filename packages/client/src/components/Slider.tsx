import * as React from 'react';
import { Slider as GuiSlider } from '@hanzo/ui/primitives/Slider';
import { cn } from '~/utils';

type BaseSliderProps = Omit<
  React.ComponentProps<typeof GuiSlider>,
  'aria-label' | 'aria-labelledby'
>;

/**
 * A slider that assistive tech can see must be NAMED, and requiring exactly one
 * of `aria-label` / `aria-labelledby` at compile time is what this wrapper is
 * for. `value`, `defaultValue`, `min`, `max`, `step`, `orientation`, `disabled`
 * and `onValueChange` carry the same names and the same shapes as before
 * (`number[]` in, `number[]` out), and `onDoubleClick` is typed on the
 * primitive's web props, so the reset-on-double-click call sites are unchanged.
 */
type SliderProps = BaseSliderProps &
  (
    | { 'aria-label': string; 'aria-labelledby'?: never }
    | { 'aria-labelledby': string; 'aria-label'?: never }
    | { 'aria-label': string; 'aria-labelledby': string }
  );

/**
 * The primitive renders its own track, range and thumb, so those three elements
 * and their class strings are gone with them.
 *
 * The names now go straight through. This file used to hand-place `aria-label`,
 * `aria-labelledby` and `aria-describedby` on the thumb, because that is where
 * `role="slider"` lives and a name spread onto the root reaches a node no
 * screen reader announces. @hanzo/ui 8.0.73 routes those four naming properties
 * to the thumb itself and keeps value, range and step on the root, so the
 * placement is the primitive's job and the compile-time requirement above is
 * all that is left here.
 *
 * One limitation to know before reaching for it: the thumb is index 0 and there
 * is exactly one, so a two-handle range slider is not expressible.
 */
const Slider = ({ className, ...props }: SliderProps) => (
  <GuiSlider
    {...props}
    className={cn(
      'relative flex w-full cursor-pointer touch-none select-none items-center',
      className,
    )}
  />
);

export { Slider };
