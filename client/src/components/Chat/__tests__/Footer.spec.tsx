/**
 * The footer strip is an OVERLAY, not a pointer target.
 *
 * Its host is `relative w-full` with no height of its own, so `absolute
 * bottom-0` pins the strip over whatever renders above it — on the landing,
 * the conversation starters. Before the fix it intercepted pointer events
 * there: the lower half of every starter chip was dead while still looking
 * clickable. Playwright refused a center-click on a chip with
 * "…role=contentinfo… intercepts pointer events", which is exactly what a
 * user's thumb hits.
 *
 * jsdom does no layout, so this pins the CONTRACT (strip transparent to
 * pointers, links re-armed). The geometry itself — a click landing on the
 * chip's center — is asserted in e2e/specs/starters.spec.ts.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({
    data: {
      customFooter: '[Hanzo Chat](https://hanzo.chat) - Powered by Hanzo AI',
      interface: {
        privacyPolicy: { externalUrl: 'https://hanzo.ai/privacy' },
        termsOfService: { externalUrl: 'https://hanzo.ai/terms' },
      },
    },
  }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

import Footer from '../Footer';

describe('Chat Footer', () => {
  it('does NOT intercept pointer events over the content it overlays', () => {
    render(<Footer />);
    const strip = screen.getByRole('contentinfo');
    expect(strip).toHaveClass('pointer-events-none');
  });

  it('keeps every one of its links clickable', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveClass('pointer-events-auto');
    }
  });

  it('stays transparent to pointers even when a caller supplies its own layout', () => {
    // ShareView renders the footer in normal flow with a custom className; the
    // guarantee must not depend on the default class string.
    render(<Footer className="relative mx-auto mt-4 flex gap-2 px-3" />);
    expect(screen.getByRole('contentinfo')).toHaveClass('pointer-events-none');
  });
});
