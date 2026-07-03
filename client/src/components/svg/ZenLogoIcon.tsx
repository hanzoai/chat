import React from 'react';

export interface ZenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Accepted for drop-in parity with lucide icons. */
  strokeWidth?: number;
}

/**
 * Zen mark — the ensō (円相): a single brushstroke circle, the canonical Zen
 * symbol. Monochrome, `currentColor` stroke, round-capped with a tapering tail so
 * it reads as a brushstroke rather than a plain ring. Used as the avatar for the
 * Zen (Hanzo AI) model family in place of the generic LibreChat "custom" glyph.
 */
export default function ZenLogoIcon({
  className = '',
  size,
  strokeWidth = 2,
  ...props
}: ZenLogoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
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
      {/* ensō: ~330° sweep, gap at the upper-right, tapered brush ends */}
      <path
        d="M16.9 6.2 A 8 8 0 1 0 18.4 9.1"
        strokeWidth={strokeWidth + 0.4}
      />
      {/* brush tail — the short overlapping accent stroke that opens the ring */}
      <path d="M18.4 9.1 L 20.2 6.6" strokeWidth={strokeWidth - 0.4} />
    </svg>
  );
}
