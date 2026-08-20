/**
 * The glyph for a side panel — ONE geometry, reflected.
 *
 * Chat has a panel on each edge, and before this they were drawn by three
 * different lucide icons that did not agree with each other: the left sidebar
 * wore `Sidebar`, the right control panel wore `PanelRight`, and the canvas
 * wore `PanelRight` TOO — one glyph on two buttons in the same row, which names
 * neither of them.
 *
 * A reflection is the honest way to draw a mirrored pair, so this is a single
 * path drawn for the LEFT and flipped for the right. Nothing can drift, because
 * there is only one set of coordinates: `scale(-1,1)` about the middle of the
 * box, which is exactly what "the same control, other edge" means.
 *
 * OPEN and SHUT differ by the WIDTH of the bar, not by a second icon. A panel
 * that is open is a wide pane; shut, it is the rail that is left of it. That is
 * literally what the reader sees on screen, so the glyph is a small picture of
 * the window rather than a symbol to memorise — and it animates between the two
 * states instead of swapping, so a toggle reads as one thing changing.
 */
import { cn } from '~/utils';

/** The frame, in the 24-unit box every icon here is drawn in. */
const EDGE = 3;
const SPAN = 18;
/** Where the divider sits, shut and open. The shut one is the 56px rail's share
 *  of a 260px column, drawn to scale; the open one is a pane you can read. */
const RAIL = EDGE + 4;
const PANE = EDGE + 8;

export default function Pane({
  side,
  open,
  className,
}: {
  side: 'left' | 'right';
  open: boolean;
  className?: string;
}) {
  const x = open ? PANE : RAIL;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5', className)}
    >
      {/* The reflection. `scale(-1,1)` alone would put the drawing off the left
          of the box, so it is translated back across — the pair of operations
          IS the mirror, and splitting them would be two half-mirrors. */}
      <g transform={side === 'right' ? 'translate(24,0) scale(-1,1)' : undefined}>
        <rect x={EDGE} y={EDGE} width={SPAN} height={SPAN} rx={3} />
        {/* The pane's own edge. It moves rather than appears, so shut and open
            are one glyph at two widths. */}
        <line x1={x} y1={EDGE} x2={x} y2={EDGE + SPAN} style={{ transition: 'all .2s ease' }} />
        {/* Filled, because a pane that is OPEN is holding something. Shut, the
            same fill is the rail — narrow, still there, which is the truth on
            screen: this app's sidebar never leaves, it narrows. */}
        <path
          d={`M${EDGE + 3} ${EDGE}h${x - EDGE - 3}v${SPAN}h-${x - EDGE - 3}a3 3 0 0 1-3-3v-${SPAN - 6}a3 3 0 0 1 3-3z`}
          fill="currentColor"
          stroke="none"
          opacity={open ? 0.9 : 0.55}
          style={{ transition: 'all .2s ease' }}
        />
      </g>
    </svg>
  );
}
