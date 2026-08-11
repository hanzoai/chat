import { render, screen } from '@testing-library/react';

/**
 * The top-left corner, which is the one piece of branding on screen for the
 * whole session — signed in, signed out, open sidebar and collapsed rail.
 *
 * One image serves every brand, so what the corner renders has to be a question
 * asked at runtime. It was not: the mark was Hanzo's H and it opened a panel
 * titled "Hanzo apps" listing hanzo.ai surfaces, on lux.chat.
 *
 * Reading the built bundle cannot answer this. Both brands' branches are
 * compiled into the same file, so `grep com_nav_hanzo_apps dist/` matches
 * whether or not the launcher ever mounts — string presence is not rendering.
 * These specs render it.
 */

let mockOrg = 'hanzo';
jest.mock('~/utils/iam', () => ({
  get IAM_ORG() {
    return mockOrg;
  },
}));
jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('@hanzogui/shell', () => ({
  HanzoMark: () => <span data-testid="hanzo-mark" />,
  HanzoAppLauncher: ({ label, trigger }: { label: string; trigger: () => JSX.Element }) => (
    <div data-testid="launcher" aria-label={label}>
      {trigger()}
    </div>
  ),
}));

import BrandCorner from './BrandCorner';

describe('the corner on Hanzo', () => {
  beforeEach(() => {
    mockOrg = 'hanzo';
    render(<BrandCorner />);
  });

  /* The switcher is Hanzo's estate and belongs to Hanzo's tenant, unchanged. */
  it('keeps the switcher and the H', () => {
    expect(screen.getByTestId('launcher')).toBeInTheDocument();
    expect(screen.getByTestId('hanzo-mark')).toBeInTheDocument();
  });
});

describe('the corner on another tenant', () => {
  beforeEach(() => {
    mockOrg = 'lux';
    render(<BrandCorner />);
  });

  /* The defect, stated as a test: neither Hanzo's logo nor Hanzo's app menu. */
  it("renders no Hanzo mark and no Hanzo app switcher", () => {
    expect(screen.queryByTestId('hanzo-mark')).not.toBeInTheDocument();
    expect(screen.queryByTestId('launcher')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('com_nav_hanzo_apps');
  });

  /* The corner is not merely emptied — an empty corner would cost the rail its
     only affordance. It carries THIS brand's mark, from the same directory the
     favicon comes from. */
  it("renders this brand's own mark, from the brand's own directory", () => {
    const img = screen.getByTestId('mark');
    expect(img).toHaveAttribute('src', '/assets/brand/lux/apple-touch-icon-180x180.png');
  });
});
