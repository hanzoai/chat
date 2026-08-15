import * as React from 'react';
import { Accordion as GuiAccordion } from '@hanzo/ui/primitives/Accordion';
import { AccordionItem as GuiAccordionItem } from '@hanzo/ui/primitives/AccordionItem';
import { AccordionTrigger as GuiAccordionTrigger } from '@hanzo/ui/primitives/AccordionTrigger';
import { AccordionContent as GuiAccordionContent } from '@hanzo/ui/primitives/AccordionContent';
import { cn } from '~/utils';

/**
 * `type`, `value`, `defaultValue`, `onValueChange`, `collapsible`, `disabled`,
 * `orientation` and `dir` are the same props on the same root, so this is the
 * primitive itself.
 */
const Accordion = GuiAccordion;

const AccordionItem = ({
  className = '',
  ...props
}: React.ComponentProps<typeof GuiAccordionItem>) => (
  <GuiAccordionItem {...props} className={cn('border-b', className)} />
);
AccordionItem.displayName = 'AccordionItem';

/**
 * @hanzo/ui's trigger IS the header and the trigger fused: it renders the
 * heading element, a real `type="button"` button, and its own chevron turned
 * from the row's open state. So the local `<Header>` wrapper, the local
 * chevron and the arbitrary-variant rule that rotated it all go together — that
 * rule selected a child this file no longer renders, and gui compiles its own
 * rotation into a runtime sheet a Tailwind attribute rule loses to regardless.
 *
 * The removed utilities are named nowhere here on purpose: Tailwind's scanner is
 * a regex over file text and cannot tell a comment from markup, so writing one
 * out regenerates the rule that was just deleted.
 */
const AccordionTrigger = ({
  className = '',
  ...props
}: React.ComponentProps<typeof GuiAccordionTrigger>) => (
  <GuiAccordionTrigger
    {...props}
    className={cn(
      'flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline',
      className,
    )}
  />
);
AccordionTrigger.displayName = 'AccordionTrigger';

/**
 * The height animation belongs to the primitive now, and the two utilities that
 * used to drive it go with it: their keyframes interpolate a custom property
 * Radix set and nothing sets any more, so both ends of the animation read as
 * invalid. The opacity pair stays — it keys on `data-state`, which gui writes
 * here.
 *
 * `pb` is handed back to the inner element. The primitive pads its own bottom,
 * and the padding here is the caller's to change — call sites merge into that
 * class through `cn()`. Left set, the two would stack.
 */
const AccordionContent = ({
  className = '',
  children,
  ...props
}: React.ComponentProps<typeof GuiAccordionContent>) => (
  <GuiAccordionContent
    pb={undefined}
    {...props}
    className="overflow-y-hidden overflow-x-visible text-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </GuiAccordionContent>
);
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
