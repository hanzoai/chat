import { expect, test, type Page } from '@playwright/test';

/** Phone, tablet, laptop, desktop — the widths the column has to hold. */
const WIDTHS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1440, height: 900 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const;

/** Below this the sidebar is a drawer, so there is no rail to collapse to. */
const MD = 768;
const RAIL = 56;

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `e2e/playwright-report/sidebar-${name}.png` });

/**
 * Lands on the chat view at a given width, with the column in the state the
 * test is about. A visitor's column starts at the rail, so neither state can be
 * assumed — `column: 'open'` asks for the open one and leaves it alone if it is
 * already there.
 */
async function land(
  page: Page,
  width: number,
  height: number,
  column: 'asis' | 'open' = 'asis',
) {
  await page.setViewportSize({ width, height });
  await page.goto('/c/new', { timeout: 30000 });
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20000 });
  if (column === 'open') {
    const opener = page.getByTestId('open-sidebar-button');
    if (await opener.count()) {
      await opener.first().click();
    }
  }
  await page.waitForTimeout(700);
}

test.describe('the sidebar column', () => {
  for (const { name, width, height } of WIDTHS) {
    test(`${name} — the foot survives the collapse and stays inside the rail`, async ({ page }) => {
      await land(page, width, height);
      const nav = page.locator('#chat-history-nav');

      await shot(page, `${name}-open`);
      await expect(nav, 'no balance in the column').not.toContainText(/balance/i);

      if (width < MD) {
        return;
      }

      // Signed in the foot is the account menu; signed out it is the log-in row.
      // Both are `ROW` inside the rail, so either answers the geometry question.
      const foot = nav.locator('[data-testid="nav-user"], [data-testid="rail-log-in"]').first();
      const before = await foot.count();
      expect(before, 'the column has a foot while open').toBeGreaterThan(0);

      // The column may already be at the rail (a visitor's default), so this
      // asks for the rail rather than assuming a state to toggle out of.
      const close = page.getByTestId('close-sidebar-button');
      if (await close.count()) {
        await close.first().click();
        await page.waitForTimeout(600);
      }
      await expect(page.getByTestId('open-sidebar-button')).toBeVisible();
      await shot(page, `${name}-rail`);

      await expect(foot, 'the foot survives the collapse').toBeVisible();
      const box = await foot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x, 'the foot starts inside the rail').toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, 'the foot ends inside the rail').toBeLessThanOrEqual(RAIL + 1);

      const head = nav.locator('[data-testid="open-sidebar-button"]').first();
      const hbox = await head.boundingBox();
      expect(hbox).not.toBeNull();
      // The mark is centred in the rail, not pushed off it by the column's padding.
      const centre = hbox!.x + hbox!.width / 2;
      expect(Math.abs(centre - RAIL / 2), `mark centre ${centre} vs rail centre ${RAIL / 2}`).toBeLessThanOrEqual(2);
    });
  }

  test('one translucent ground, and no opaque slab used as a state', async ({ page }) => {
    await land(page, 1440, 900);

    const grounds = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const resolve = (v: string) => {
        const el = document.createElement('div');
        el.style.backgroundColor = v;
        document.body.appendChild(el);
        const out = getComputedStyle(el).backgroundColor;
        el.remove();
        return out;
      };
      return {
        hover: resolve(s.getPropertyValue('--surface-row-hover').trim()),
        active: resolve(s.getPropertyValue('--surface-row-active').trim()),
      };
    });
    // Translucent means it carries an alpha below 1, whatever colour space the
    // browser resolves `color-mix` into — Chrome answers in oklab.
    const TRANSLUCENT = /(\/\s*0?\.\d+\s*\)|,\s*0?\.\d+\s*\))/;
    expect(grounds.hover, `hover ground is translucent: ${grounds.hover}`).toMatch(TRANSLUCENT);
    expect(grounds.active, `selected ground is translucent: ${grounds.active}`).toMatch(TRANSLUCENT);
    expect(grounds.hover).not.toBe(grounds.active);

    const slabs = await page.evaluate(() => {
      const nav = document.querySelector('#chat-history-nav');
      if (!nav) return ['no nav'];
      return Array.from(nav.querySelectorAll<HTMLElement>('*'))
        .filter((el) => Array.from(el.classList).some((c) => c.endsWith('bg-surface-active-alt')))
        .filter((el) => !el.closest('form'))
        .map((el) => el.className.slice(0, 120));
    });
    expect(slabs, `opaque slab used as a state: ${slabs.join(' | ')}`).toHaveLength(0);
  });
});

test.describe('the open column', () => {
  for (const { name, width, height } of WIDTHS.filter((w) => w.width >= MD)) {
    test(`${name} — the column is drawn and states no balance`, async ({ page }) => {
      await land(page, width, height, 'open');
      await expect(page.getByTestId('close-sidebar-button')).toBeVisible();
      await page.screenshot({ path: `e2e/playwright-report/open-${name}.png` });
      await expect(page.locator('#chat-history-nav')).not.toContainText(/balance/i);
    });
  }

  test('a focused row wears the shared ring, not a hard black/white rectangle', async ({ page }) => {
    await land(page, 1440, 900, 'open');

    // Tab until focus is INSIDE the column — the first stop is not reliably a
    // row, and the question is what a focused ROW paints.
    let ring: { tag: string; label: string; ringColor: string } | null = null;
    for (let i = 0; i < 12 && ring === null; i++) {
      await page.keyboard.press('Tab');
      ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const nav = document.querySelector('#chat-history-nav');
        if (!el || !nav || !nav.contains(el)) return null;
        const s = getComputedStyle(el);
        return {
          tag: el.tagName,
          label: el.getAttribute('aria-label') ?? el.textContent?.slice(0, 40) ?? '',
          ringColor: s.getPropertyValue('--tw-ring-color').trim(),
        };
      });
    }

    expect(ring, 'focus reached a control inside the column').not.toBeNull();
    // The old ring was literally black or white; the shared one is the border token.
    expect(ring!.ringColor, `focused ${ring!.tag} "${ring!.label}" ring=${ring!.ringColor}`)
      .not.toMatch(/^rgb\(0,\s*0,\s*0\)$|^rgb\(255,\s*255,\s*255\)$|^#000000$|^#ffffff$/i);
  });
});
