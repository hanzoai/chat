import React from 'react';

export interface HanzoLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
  /** Accepted for drop-in parity with lucide icons; ignored (mark is fill-based). */
  strokeWidth?: number;
}

/**
 * Official Hanzo ▼/H mark — monochrome, `currentColor` fill.
 *
 * Canonical brand source: `@hanzo/logo` (hanzo.app / hanzo.ai favicon set).
 * Drop-in replacement for the upstream LibreChat lucide `Feather` brand fallback.
 */
export default function HanzoLogoIcon({
  className = '',
  size,
  strokeWidth: _strokeWidth,
  ...props
}: HanzoLogoIconProps) {
  return (
    <svg
      viewBox="0 0 67 67"
      className={className}
      {...(size != null ? { width: size, height: size } : {})}
      fill="currentColor"
      role="img"
      aria-label="Hanzo"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M22.21 67V44.6369H0V67H22.21Z" />
      <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" />
      <path d="M22.21 0H0V22.3184H22.21V0Z" />
      <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" />
      <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" />
    </svg>
  );
}
