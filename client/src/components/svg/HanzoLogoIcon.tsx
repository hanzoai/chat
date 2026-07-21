import React from 'react';
import { MARK_PATHS, MARK_VIEWBOX } from '@hanzo/logo';

export interface HanzoLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Accepted for drop-in parity with lucide icons; ignored (mark is fill-based). */
  strokeWidth?: number;
}

/**
 * Official Hanzo block-H mark — monochrome, `currentColor` fill.
 *
 * Geometry comes from `@hanzo/logo` (`MARK_PATHS` / `MARK_VIEWBOX`, the ONE home
 * of the mark) — this component no longer re-types the paths. Drop-in
 * replacement for the upstream Chat lucide `Feather` brand fallback.
 */
export default function HanzoLogoIcon({
  className = '',
  size,
  strokeWidth: _strokeWidth,
  children: _children,
  ...props
}: HanzoLogoIconProps) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      {...(size != null ? { width: size, height: size } : {})}
      fill="currentColor"
      role="img"
      aria-label="Hanzo"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      // MARK_PATHS is a build-time-trusted @hanzo/logo constant — never user input.
      dangerouslySetInnerHTML={{ __html: MARK_PATHS }}
    />
  );
}
