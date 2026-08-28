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
  /** A temporary chat says so by being SOLID — the one surface here that is not
   *  glass, because it is the one that is not being kept. */
  temporary?: boolean;
}

/*
 * ONE radius, every state. An earlier build rounded only the top corners on a
 * phone (`rounded-t-3xl`, via a `docked` prop) on the theory that the docked
 * composer met the bottom edge of the viewport — but on the empty/landing state
 * the composer floats mid-screen with content below it, so the square bottom
 * read as "not rounded". The bottom margin that clears the home indicator is the
 * caller's (`ChatForm`'s `pb-4 sm:pb-0`), not this shell's, so nothing here needs
 * to know whether it docks.
 */

export default function ComposerShell({
  children,
  className,
  onClick,
  temporary = false,
}: ComposerShellProps) {
  // ONE CORNER, WORN BY BOTH BOXES, and the host has to wear it as a class.
  //
  // The package states it — `.hz-composer { border-radius: var(--hz-composer-radius) }`
  // — and that declaration does not survive our build. postcss-preset-env
  // inlines custom properties, resolves the ones whose value is a literal
  // (`padding` came out `1.5px`) and DROPS a declaration it cannot resolve;
  // `--hz-composer-radius` is `var(--radius-composer, 9999px)`, a var pointing
  // at a var, which it does not follow. So the shipped rule reads
  // `position:relative;isolation:isolate;padding:1.5px` and no radius at all.
  //
  // The ring is `::before` with `border-radius: inherit`, so it inherited that
  // nothing and painted a SQUARE around a 24px panel — a hard-cornered outline
  // 1.5px outside the glass, on every chat. The halo escaped it only because
  // `::after` computes `calc(radius + inset)`, which preset-env kept.
  //
  // A utility class is a literal and cannot be dropped, so the corner is stated
  // once here and worn by the host and the panel alike. `--hz-composer-radius`
  // stays: the halo still derives its wider corner from it.
  const radius = 'rounded-3xl';
  return (
    <div className={cn('hz-composer w-full', radius, temporary && 'private')}>
      <div
        onClick={onClick}
        className={cn(
          // `field` draws the keyboard focus ring HERE, at this shell's radius —
          // otherwise the global `.dark :focus-visible` paints a square one
          // around the bare textarea inside the curve. See style.css.
          'field relative flex w-full flex-grow flex-col overflow-hidden border text-text-primary transition-all duration-200',
          radius,
          // `glass` carries its material only inside `@supports (backdrop-filter)`,
          // and its fill is `!important`, so the token underneath is a no-op
          // wherever the blur is live and the whole background wherever it is
          // not. Drop it and a browser that cannot blur gets a composer with no
          // background at all — text floating on the video. `elevation-2` is the
          // pair glass expects: the sheet ships no shadow of its own, and on a
          // light page a 72%-white panel with no edge has none.
          // A PRIVATE CHAT IS OPAQUE, and that is the whole idea rather than a
          // colour choice: every other surface in this app is glass, so the one
          // you can't see through is the one that isn't being kept. It reads
          // without a legend, and it reads at a glance — which is what a mode
          // with consequences needs, because the cost of not noticing it is
          // asymmetric.
          //
          // It was a violet tint before, which said nothing (violet is not a
          // meaning here) and said it faintly — `bg-violet-950/10` over glass is
          // a 10% wash, so the reef still read straight through the box you were
          // told was private. It was also the one violet left in a monochrome
          // app after `--hanzo-accent` was overridden to white.
          temporary
            ? 'border-border-medium bg-black'
            : 'glass elevation-2 border-transparent bg-surface-chat',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
