import { expect, test } from '@playwright/test';

/**
 * A starter chip must be clickable where a user actually clicks it: the middle.
 *
 * The footer strip ("Powered by Hanzo AI · Privacy policy · Terms of service")
 * is an overlay — its host has no height, so `absolute bottom-0` pins it over
 * the row of starter chips. While it was a pointer target it swallowed clicks
 * aimed at the chips' lower half: the chip looked clickable and did nothing.
 *
 * These assertions fail on that geometry. `elementFromPoint` at the chip's exact
 * center names the culprit, and the plain `click()` below is the user's gesture —
 * Playwright verifies the hit target at the click point, so an intercepted chip
 * throws rather than silently passing.
 *
 * Runs against E2E_BASE_URL so the same spec can be pointed at a deployment.
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3080';

test.describe('Conversation starters', () => {
  test('a starter chip owns its own center — the footer does not intercept', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    // The landing opens in Search; the starters live on the Chat surface.
    const modeChip = page.getByRole('button', { name: 'Chat', exact: true }).first();
    await modeChip.waitFor({ state: 'visible', timeout: 60000 });
    await modeChip.click();

    const chip = page.getByRole('button', { name: 'Explain', exact: true }).first();
    await chip.waitFor({ state: 'visible' });

    // 1. Geometry: the chip's exact center must resolve to the chip itself.
    const box = (await chip.boundingBox())!;
    expect(box).not.toBeNull();
    const owner = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const btn = el?.closest('button');
        return {
          isChip: btn?.textContent?.trim() === 'Explain',
          // Names the overlay when it is the one on top.
          top: el?.closest('[role="contentinfo"]') ? 'footer(contentinfo)' : (el?.tagName ?? 'none'),
        };
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(owner.top).not.toBe('footer(contentinfo)');
    expect(owner.isChip).toBe(true);

    // 2. The gesture: a plain center click, with Playwright's hit-target check.
    await chip.click();

    // 3. And it sent — the chip's text becomes a turn, the composer clears.
    await expect(page.getByText('Explain how HTTPS keeps a connection private')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('textarea').first()).toHaveValue('');
  });
});
