import React from 'react';

export interface EnsoLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Stroke width in the 100-unit viewBox. Matches ZenLogoIcon for optical parity. */
  strokeWidth?: number;
}

/**
 * Enso mark — a CLOSED ring.
 *
 * Not the same mark as Zen, and the difference is the whole point. The Zen ensō
 * (ZenLogoIcon) is drawn open: a single brush arc with a gap, the canonical 円相.
 * Enso the router is drawn CLOSED — it is the rung that completes the circle by
 * picking the right model, so the mark has no gap.
 *
 * Both share the 0 0 100 100 viewBox, stroke-width 11 and round caps, so they sit
 * at identical optical weight beside each other in a model list. The ONLY visual
 * difference is the gap, which is exactly the distinction being drawn.
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
      {/* Closed ring. r=37 matches the Zen arc's radius so the two marks are the
          same size on screen and only the gap distinguishes them. */}
      <circle cx="50" cy="50" r="37" strokeWidth={strokeWidth} />
    </svg>
  );
}
