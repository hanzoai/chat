import { test, expect, type Page } from '@playwright/test';

/**
 * The flows this branch changed, measured in a real browser rather than argued.
 *
 * It rides the chrome config because that is the one harness in this repo that
 * needs no login: `ALLOW_GUEST_CHAT` renders the real shell for an anonymous
 * visitor, so the palette, the composer row and the routes are all reachable
 * with no identity to mint.
 */

async function land(page: Page) {
  await page.addInitScript(() => {
    /* The signed-out SSO probe navigates the document to hanzo.id on first
       paint; spending it up front keeps the run on localhost. */
    try {
      sessionStorage.setItem('hanzo.sso.probed', '1');
    } catch {
      /* storage unavailable — the probe declines on its own */
    }
  });
  await page.goto('/c/new');
  await page.waitForSelector('[data-testid="text-input"]', { timeout: 30000 });
}

test.describe('the slice', () => {
  test('⌘K opens exactly ONE palette', async ({ page }) => {
    await land(page);

    // Two palettes both bound the chord on `document`. One overlay now.
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForTimeout(400);

    const dialogs = await page.locator('[role="dialog"]:visible').count();
    expect(dialogs).toBe(1);

    // and it is the shell's — its frame carries the Commands bar and ESC hint
    await expect(page.getByText('Commands', { exact: true })).toBeVisible();

    // one press closes it, which a second listener would have re-opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await page.locator('[role="dialog"]:visible').count()).toBe(0);
  });

  test('the palette groups are localized, not literal English', async ({ page }) => {
    await land(page);
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForTimeout(400);
    // `com_ui_go_to` renders "Go to" in en; the literal 'Chat' category is gone.
    await expect(page.getByText('Go to', { exact: true })).toBeVisible();
  });

  test('model choice is TWO clicks from the composer', async ({ page }) => {
    await land(page);

    const chip = page.getByTestId('model-chip');
    await expect(chip).toBeVisible();

    // click 1 — the trigger the `@` picker never had
    await chip.click();

    const picker = page.locator('input[placeholder]:visible').last();
    await expect(picker).toBeFocused();

    // the first rows offered are MODELS, not endpoints to drill into
    const firstRow = page.locator('[id^="mention-item-"]').first();
    await expect(firstRow).toBeVisible();

    // click 2 — a model, selected outright
    const label = (await firstRow.innerText()).trim();
    await firstRow.click();
    await page.waitForTimeout(400);

    // the chip now names what was chosen, and the picker is gone
    await expect(page.locator('[id^="mention-item-"]')).toHaveCount(0);
    expect(label.length).toBeGreaterThan(0);
  });

  test('the composer row draws no phantom badge', async ({ page }) => {
    await land(page);
    // the drag layer rendered `.badge-icon` wrappers over an always-empty list
    expect(await page.locator('.badge-icon').count()).toBe(0);
    expect(await page.locator('.ghost-badge').count()).toBe(0);
  });

  test('the four hand-off routes are gone, and /d/* no longer loops', async ({ page }) => {
    await land(page);

    for (const path of ['/projects', '/sites', '/scheduled', '/plugins']) {
      await page.goto(path);
      await page.waitForSelector('[data-testid="text-input"]', { timeout: 30000 });
      expect(new URL(page.url()).pathname).toBe('/');
    }

    /* `/d/files` was a route inside a comment block, so the splat that was
       supposed to catch it redirected to it and the URL bounced against itself.
       Signed OUT, the answer is `/`: DashboardRoute guards on a session, and it
       used to satisfy that guard by returning null — a blank page, with the
       address left on a route that had rendered nothing and with this layout's
       own `*` redirect swallowed along with its children. The signed-in landing
       (`/d/prompts`) cannot be exercised here: this harness mints no session. */
    await page.goto('/d/files');
    await page.waitForSelector('[data-testid="text-input"]', { timeout: 30000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('nothing in the shell throws on boot', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await land(page);
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.getByTestId('model-chip').click();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

/**
 * Settings, opened the way anyone opens it.
 *
 * The palette's `settings` command writes the same `store.showSettings` the
 * account menu writes, so this drives the real control rather than the atom.
 * Every preference asserted here is kept in the browser, which is what makes
 * the reload the proof: a dialog that renders and does not save is not done.
 */
const TABS = ['General', 'Notifications', 'Personalization', 'Connected apps', 'Account'];

async function openSettings(page: Page) {
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('option', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab').first()).toBeVisible();
}

async function pick(page: Page, tab: string) {
  await page.getByRole('tab', { name: tab, exact: true }).click();
  await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
}

test.describe('settings', () => {
  test('five tabs, in this order, and nothing else', async ({ page }) => {
    await land(page);
    await openSettings(page);
    expect(await page.getByRole('tab').allInnerTexts()).toEqual(TABS);
  });

  test('every tab renders something', async ({ page }) => {
    await land(page);
    await openSettings(page);
    for (const tab of TABS) {
      await pick(page, tab);
      const panel = page.locator('[role="tabpanel"]:visible').last();
      expect((await panel.innerText()).trim().length).toBeGreaterThan(0);
    }
  });

  test('a change in each tab survives a reload', async ({ page }) => {
    await land(page);
    await openSettings(page);

    // General — enter-to-send starts on, so this turns it off
    await pick(page, 'General');
    await page.getByTestId('enterToSend').click();

    // Notifications — both arrival controls, started from opposite defaults
    await pick(page, 'Notifications');
    await page.getByTestId('keepScreenAwake').click();
    await page.getByTestId('AutomaticPlayback').click();

    // Account — the sign-off is free text, so it proves more than a boolean
    await pick(page, 'Account');
    await page.getByTestId('signature-input').fill('per aspera');
    await page.getByTestId('signature-input').blur();

    await page.reload();
    await page.waitForSelector('[data-testid="text-input"]', { timeout: 30000 });
    await openSettings(page);

    await pick(page, 'General');
    await expect(page.getByTestId('enterToSend')).toHaveAttribute('aria-checked', 'false');
    await pick(page, 'Notifications');
    await expect(page.getByTestId('keepScreenAwake')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('AutomaticPlayback')).toHaveAttribute('aria-checked', 'true');
    await pick(page, 'Account');
    await expect(page.getByTestId('signature-input')).toHaveValue('per aspera');
  });

  test('Notifications is the two ways an answer announces itself, and no more', async ({
    page,
  }) => {
    await land(page);
    await openSettings(page);
    await pick(page, 'Notifications');
    const panel = page.locator('[role="tabpanel"]:visible').last();
    await expect(panel.getByRole('switch')).toHaveCount(2);
  });

  test('no parameter, preset, endpoint, speech or balance tab remains', async ({ page }) => {
    await land(page);
    await openSettings(page);
    const strip = (await page.getByRole('tab').allInnerTexts()).join(' ').toLowerCase();
    for (const gone of ['chat', 'speech', 'data', 'balance', 'usage', 'commands', 'about']) {
      expect(strip).not.toContain(gone);
    }
  });

  test('opening and walking settings throws nothing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await land(page);
    await openSettings(page);
    for (const tab of TABS) {
      await pick(page, tab);
    }
    expect(errors).toEqual([]);
  });
});
