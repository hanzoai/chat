import React from 'react';

export interface ZenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Stroke width in the 100-unit viewBox (canonical mark = 11). Accepted for drop-in parity with lucide icons. */
  strokeWidth?: number;
}

/**
 * Zen mark — the ensō (円相): a single brush-drawn arc with a gap, the canonical
 * Zen symbol. Geometry matches the canonical asset in github.com/zenlm/logo (the
 * `ENSO` path on a 0 0 100 100 viewBox, stroke-width 11). Monochrome,
 * `currentColor` stroke, round-capped. Used as the avatar for the Zen (Hanzo AI)
 * model family in place of the generic Chat "custom" glyph.
 */
export default function ZenLogoIcon({
  className = '',
  size,
  strokeWidth = 11,
  ...props
}: ZenLogoIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      {...(size != null ? { width: size, height: size } : {})}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      role="img"
      aria-label="Zen"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* ensō: single open arc with a gap — the canonical zenlm/logo mark */}
      <path d="M66.22 83.26 A37 37 0 1 1 85.57 60.20" strokeWidth={strokeWidth} />
    </svg>
  );
}
