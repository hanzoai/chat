import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiTestProvider } from 'test/gui-provider';
import Settings from './Settings';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('@hanzochat/client', () => ({
  GearIcon: () => <span aria-hidden="true" />,
  UserIcon: () => <span aria-hidden="true" />,
  PersonalizationIcon: () => <span aria-hidden="true" />,
  useMediaQuery: () => false,
}));

jest.mock('./SettingsTabs', () => ({
  General: () => <div data-testid="general-panel" />,
  Notifications: () => <div data-testid="notifications-panel" />,
  Personalization: () => <div data-testid="personalization-panel" />,
  Apps: () => <div data-testid="apps-panel" />,
  Account: () => <div data-testid="account-panel" />,
}));

/** The whole tab strip, in order. A sixth entry is a product decision, not a
 *  refactor, so it has to change this line to land. */
const TABS = [
  'com_nav_setting_general',
  'com_nav_setting_notifications',
  'com_nav_setting_personalization',
  'com_nav_setting_apps',
  'com_nav_setting_account',
];

function renderSettings() {
  // The tab strip is a @hanzo/ui primitive now, and those read their theme from
  // GuiProvider — bare `render` reproduces a configuration the app never ships.
  return render(
    <GuiTestProvider>
      <Settings open={true} onOpenChange={jest.fn()} />
    </GuiTestProvider>,
  );
}

describe('Settings', () => {
  it('offers five tabs, in order, to everyone', () => {
    renderSettings();

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(TABS);
  });

  it('opens on General', () => {
    renderSettings();

    expect(screen.getByTestId('general-panel')).toBeInTheDocument();
  });

  it.each([
    ['com_nav_setting_notifications', 'notifications-panel'],
    ['com_nav_setting_personalization', 'personalization-panel'],
    ['com_nav_setting_apps', 'apps-panel'],
    ['com_nav_setting_account', 'account-panel'],
  ])('shows the %s panel when its tab is picked', async (label, panel) => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByText(label));

    expect(screen.getByTestId(panel)).toBeInTheDocument();
  });

  /** Arrow keys read the same list the strip is built from. They used to read a
   *  second copy of it, which is how the two came to disagree. */
  it('walks the strip with the arrow keys', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByText(TABS[0]));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('notifications-panel')).toBeInTheDocument();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByTestId('general-panel')).toBeInTheDocument();

    await user.keyboard('{End}');
    expect(screen.getByTestId('account-panel')).toBeInTheDocument();
  });
});
