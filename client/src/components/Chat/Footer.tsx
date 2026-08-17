import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Constants } from '@hanzochat/data-provider';
import { useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * ONE link style for every footer link (main content, privacy, terms).
 *
 * No underline. A rule of underlined links across the bottom of every screen is
 * a second horizontal line competing with the composer above it; the link says
 * it is a link by lifting to the foreground colour under the pointer, which is
 * how the rest of the product spells the same thing.
 *
 * `pointer-events-auto` re-arms the links against the strip's
 * `pointer-events-none` — see the note on the container below.
 *
 * The padding is the target, and the negative margin is what keeps it honest.
 * These are the two links a visitor is entitled to reach before they type, and
 * they measured 16px tall at 390 — the line box of 12px text, nothing more,
 * where hanzo.ai gives the same two links 44px and hanzo.id gives them 45. On a
 * phone that is a legal link you aim at and miss. Vertical padding on an inline
 * box is hit-tested but does not enter the line box, so 14 + 16 + 14 = 44 buys
 * the target out of space the line box never reports.
 *
 * The margin is not decoration: without it the target grows past the strip and
 * floats over whatever is above, which is the pointer theft this file already
 * fixed once by leaving `absolute`. Cancelled, the hit area lands exactly
 * inside the strip's own padding — measured escape above and below: 0.
 */
const LINK =
  'pointer-events-auto -my-3.5 py-3.5 text-text-secondary hover:text-text-primary';

export default function Footer({ className }: { className?: string }) {
  const { data: config } = useGetStartupConfig();
  const localize = useLocalize();

  const privacyPolicy = config?.interface?.privacyPolicy;
  const termsOfService = config?.interface?.termsOfService;

  const privacyPolicyRender = privacyPolicy?.externalUrl != null && (
    <a className={LINK} href={privacyPolicy.externalUrl} rel="noreferrer">
      {localize('com_ui_privacy_policy')}
    </a>
  );

  const termsOfServiceRender = termsOfService?.externalUrl != null && (
    <a className={LINK} href={termsOfService.externalUrl} rel="noreferrer">
      {localize('com_ui_terms_of_service')}
    </a>
  );

  const mainContentParts = (
    typeof config?.customFooter === 'string'
      ? config.customFooter
      : '[Hanzo Chat ' +
        Constants.VERSION +
        '](https://hanzo.chat) - ' +
        localize('com_ui_latest_footer')
  ).split('|');

  const mainContentRender = mainContentParts.map((text, index) => (
    <React.Fragment key={`main-content-part-${index}`}>
      <ReactMarkdown
        components={{
          a: ({ node: _n, href, children, ...otherProps }) => {
            return (
              <a className={LINK} href={href} rel="noreferrer" {...otherProps}>
                {children}
              </a>
            );
          },

          p: ({ node: _n, ...props }) => <span {...props} />,
        }}
      >
        {text.trim()}
      </ReactMarkdown>
    </React.Fragment>
  ));

  const footerElements = [...mainContentRender, privacyPolicyRender, termsOfServiceRender].filter(
    Boolean,
  );

  return (
    /* pb-[env(...)]: 0 in a browser tab; in an installed PWA (viewport-fit=cover)
       it keeps the composer clear of the iPhone home indicator. */
    <div className="w-full pb-[env(safe-area-inset-bottom)]">
      {/*
        The strip lays out IN FLOW and occupies its own height.

        It used to be an overlay — a `relative w-full` host with no height of its
        own, plus `absolute bottom-0` — which pinned it on top of whatever
        rendered above it. That produced two distinct bugs from one cause. The
        first was pointer theft: a conversation starter's lower half was dead
        because the decorative strip sat over it and ate the click, while the
        chip still looked clickable. That was fixed with `pointer-events-none`
        (re-armed by `pointer-events-auto` on the links), and it did stop the
        strip intercepting — but pointer-events cannot move a box. The strip was
        still PAINTED over its neighbours, so "New search" and this strip
        overlapped by ~9px and rendered as collided text.

        Taking it out of `absolute` fixes the class rather than the symptom: an
        element that occupies its own space can neither cover a neighbour nor
        steal its clicks. `pointer-events-none` stays as defence in depth for any
        caller that passes its own positioned `className`.
      */}
      <div
        className={cn(
          className ??
            // Visible at every width. It was `hidden … sm:flex`, so the privacy
            // policy and the terms — the two links a visitor is entitled to
            // reach before they type anything — existed only on a desktop. They
            // are one line of 12px text; a phone can afford them.
            //
            // `py-3.5`, not `py-2`, because the links inside reach 44px and the
            // strip has to be tall enough to hold them: at 8px the target
            // overhung the strip by 6px on each side and was back to floating
            // over its neighbours. 14 + 16 + 14 is the same 44 on both.
            'flex w-full flex-wrap items-center justify-center gap-2 px-2 py-3.5 text-center text-xs text-text-primary md:px-[60px]',
          'pointer-events-none',
        )}
        role="contentinfo"
      >
        {footerElements.map((contentRender, index) => {
          const isLastElement = index === footerElements.length - 1;
          return (
            <React.Fragment key={`footer-element-${index}`}>
              {contentRender}
              {!isLastElement && (
                <div
                  key={`separator-${index}`}
                  className="h-2 border-r-[1px] border-border-medium"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
