import React from 'react';

export interface EnsoLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Stroke width in the 100-unit viewBox. */
  strokeWidth?: number;
}

/**
 * Enso mark — the ensō (円相), drawn CLOSED.
 *
 * Enso is Hanzo's own router model (`owned_by: hanzo`), and the ring closes
 * because Enso is the rung that completes the circle by picking the right
 * model. Zen is Zoo Labs Foundation's family and carries Zoo's mark
 * (ZenLogoIcon), so the two are told apart by shape — never by a gap in one
 * shared shape, which is what let one maker's model wear the other's identity.
 */
export default function EnsoLogoIcon({
  className = '',
  size,
  strokeWidth = 11,
  ...props
}: EnsoLogoIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      {...(size != null ? { width: size, height: size } : {})}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      role="img"
      aria-label="Enso"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Closed ring, r=37 — sized so the mark carries the same optical weight
          as the neighbouring Zen mark in a model list. */}
      <circle cx="50" cy="50" r="37" strokeWidth={strokeWidth} />
    </svg>
  );
}
