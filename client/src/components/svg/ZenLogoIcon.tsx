import React, { useId } from 'react';

export interface ZenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size; when set, applies to width and height. */
  size?: number | string;
}

/**
 * Zen mark — Zoo Labs Foundation's three overlapping circles, cut to a disc.
 *
 * Zen is Zoo Labs Foundation's model family; the gateway reports every `zen*` id
 * as `owned_by: zenlm`, and Hanzo serves and routes them. So the mark is Zoo's.
 * The ensō belongs to Enso and stays on EnsoLogoIcon.
 *
 * The cut is an SVG clipPath, in user units. A CSS `clip-path: circle(11.5px …)`
 * resolves against the RENDERED box rather than the viewBox, so at an 18px icon
 * it cuts nothing and the venn squares off into a scribble.
 */
export default function ZenLogoIcon({ className = '', size, ...props }: ZenLogoIconProps) {
  // One clip id per instance: the model picker paints this mark on every row at
  // once, and a shared DOM id ties all of them to whichever mounted first.
  const cut = `zen-cut-${useId().replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      {...(size != null ? { width: size, height: size } : {})}
      fill="currentColor"
      role="img"
      aria-label="Zen"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <clipPath id={cut}>
          <circle cx="12" cy="12" r="11.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cut})`} fill="none" stroke="currentColor">
        <circle cx="12.203" cy="6.27" r="9.509" strokeWidth="1.341" />
        <circle cx="6.189" cy="15.454" r="9.509" strokeWidth="1.341" />
        <circle cx="17.486" cy="15.454" r="9.509" strokeWidth="1.341" />
        <circle cx="12" cy="12" r="10.769" strokeWidth="1.463" />
      </g>
    </svg>
  );
}
