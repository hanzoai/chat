import * as React from 'react';
import { HoverCard as GuiHoverCard } from '@hanzo/ui/primitives/HoverCard';
import { HoverCardTrigger as GuiHoverCardTrigger } from '@hanzo/ui/primitives/HoverCardTrigger';
import { HoverCardContent as GuiHoverCardContent } from '@hanzo/ui/primitives/HoverCardContent';
import { cn } from '~/utils';

/**
 * `openDelay`, `closeDelay`, `open` and `onOpenChange` are the same props on the
 * same root — @hanzo/ui keeps Radix's 700/300 delays — so this is the primitive
 * itself. It rides gui's popover in hover mode, which reaches further than what
 * it replaces: the trigger gets `aria-expanded`, the panel `role="dialog"`, the
 * card opens on keyboard focus as well as on hover, and Escape closes it.
 */
const HoverCard = GuiHoverCard;

const HoverCardTrigger = GuiHoverCardTrigger;

/**
 * The content mounts its own portal, so there is no portal component to import.
 * The name stays and passes its children through: seventeen files wrap their
 * content in it, and the wrapping is now what it always described — nothing.
 */
const HoverCardPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

type HoverCardContentProps = React.ComponentProps<typeof GuiHoverCardContent> & {
  disabled?: boolean;
};

/**
 * `side`, `align` and `sideOffset` still land here, and the content publishes
 * them to the popper as one placement, so every call site reads the same.
 *
 * Two of the primitive's painted properties are handed back to the classes
 * below, because a gui style prop compiles to a rule the utility cannot beat and
 * both of these were the call site's to choose:
 *
 *   `width` — the panel has always been sized by the class (`w-64` here, `w-80`
 *   at eight call sites). Left set, every one of them narrows to 256px with no
 *   way for the caller to say otherwise.
 *
 *   `bg` — `glass` is the point of the class list: a hovercard is floating
 *   chrome that no slot names, so it takes the bare material and the elevation
 *   rung travels with it. An opaque token background over the top undoes that.
 *
 * Padding, radius and border stay the primitive's; its values and this file's
 * agree.
 */
const HoverCardContent = ({
  className = '',
  align = 'center',
  sideOffset = 6,
  disabled = false,
  ...props
}: HoverCardContentProps) => {
  if (disabled) {
    return null;
  }

  return (
    <GuiHoverCardContent
      align={align}
      sideOffset={sideOffset}
      width={undefined}
      bg={undefined}
      className={cn(
        // Two things left this list: the transform-origin utility that read a
        // Radix custom property, and the four side-keyed slide-in utilities.
        // The property and the `data-side` attribute were both Radix's and gui
        // writes neither. `data-state` it does write, so the fade and the zoom
        // stay. Neither removal is spelled out — Tailwind's scanner is a regex
        // over file text and would regenerate a rule named in a comment.
        'glass elevation-2 z-50 w-64 rounded-xl border border-border-light bg-surface-secondary p-4 text-text-primary outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  );
};
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardPortal };
