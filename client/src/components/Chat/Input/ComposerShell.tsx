import { cn } from '~/utils';

/**
 * The composer's box — the ONE shell every input you can type into wears.
 *
 * There were two. Chat mode rendered `ChatForm`'s shell and the web modes
 * rendered `AnswerComposer`'s, and they disagreed about nearly everything: one
 * carried the iridescent ring and the other a drop shadow, one sat on
 * `surface-chat` and the other on `surface-primary`, and their paddings differed.
 * Switching a mode tab therefore MOVED the input under the pointer — the box
 * changed identity when only its contents should have. One shell, and a mode is
 * what the composer CONTAINS rather than what it looks like.
 *
 * `hz-composer` is the host that paints the ring; it has to be a wrapper rather
 * than a class on the panel, because the ring is painted at the panel's edge and
 * the panel clips its own overflow. The panel is `glass` — the same material as
 * every menu, dialog and popover (`@hanzo/ui/glass.css`), so the ambient backdrop
 * reads through the composer instead of stopping at an opaque black slab.
 */

export interface ComposerShellProps {
  children: React.ReactNode;
  /** Extra classes for the PANEL (padding and layout inside the box). */
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** A temporary chat says so with its edge, the one exemption from the ring. */
  temporary?: boolean;
}

export default function ComposerShell({
  children,
  className,
  onClick,
  temporary = false,
}: ComposerShellProps) {
  return (
    <div className={cn('hz-composer w-full rounded-t-3xl sm:rounded-3xl', temporary && 'opacity-90')}>
      <div
        onClick={onClick}
        className={cn(
          // `field` draws the keyboard focus ring HERE, at this shell's radius —
          // otherwise the global `.dark :focus-visible` paints a square one
          // around the bare textarea inside the curve. See style.css.
          'field relative flex w-full flex-grow flex-col overflow-hidden rounded-t-3xl border text-text-primary transition-all duration-200 sm:rounded-3xl',
          // The ring IS this panel's edge, so the panel does not draw a second
          // one over it — a hairline on top of the sweep reads as a grey ring
          // with colour leaking out from behind.
          temporary ? 'border-violet-800/60 bg-violet-950/10' : 'glass border-transparent',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
