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
 */
const LINK = 'pointer-events-auto text-text-secondary hover:text-text-primary';

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
            'flex w-full flex-wrap items-center justify-center gap-2 px-2 py-2 text-center text-xs text-text-primary md:px-[60px]',
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
