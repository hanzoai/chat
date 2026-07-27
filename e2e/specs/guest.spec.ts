import { expect, test } from '@playwright/test';

/**
 * What a signed-out stranger actually SEES after sending a chat message.
 *
 * A 200 proves a server answered, not that a human got what they needed: this
 * whole class of failure arrives as the assistant's reply inside a perfectly
 * healthy 200 SSE stream. So every assertion is on rendered text, and the
 * load-bearing one is an ABSENCE — the raw upstream body must never reach the
 * reader. That leak has shipped twice in two shapes (`Unauthorized`, then a
 * bare 402 "a billable tenant is required"), so this pins the CLASS of string
 * rather than either instance.
 *
 * Runs against E2E_BASE_URL, defaulting to the local stack.
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3080';

/** Reads like plumbing, not like a sentence written for a person. */
const RAW_UPSTREAM = [
  /\b402\b/,
  /billable tenant/i,
  /no anonymous usage/i,
  /invalid API key/i,
  /An error occurred while processing/i,
  /Here's the specific error message/i,
  /\bUnauthorized\b/,
  /GUEST_LIMIT/,
];

/** A signed-out visitor, always — never a session this machine happens to hold. */
test.use({ storageState: { cookies: [], origins: [] } });

/** Land on the chat surface: the composer lives behind the Chat mode chip. */
async function openGuestChat(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  const chatChip = page.getByRole('button', { name: 'Chat', exact: true }).first();
  await chatChip.waitFor({ state: 'visible', timeout: 90000 });
  await chatChip.click();
  const composer = page.locator('textarea').first();
  await composer.waitFor({ state: 'visible', timeout: 30000 });
  return composer;
}

test.describe('Signed-out visitor', () => {
  test('never sees a raw upstream error as the assistant reply', async ({ page }) => {
    const composer = await openGuestChat(page);
    await composer.fill('hello');
    await composer.press('Enter');
    await page.waitForTimeout(15000);

    const body = await page.locator('body').innerText();
    for (const pattern of RAW_UPSTREAM) {
      expect(body, `raw upstream text leaked to the reader: ${pattern}`).not.toMatch(pattern);
    }

    // There must be a way forward, and it must be clickable AT ITS CENTER —
    // an affordance an overlay eats is not an affordance.
    const signIn = page
      .getByRole('button', { name: /sign in|log in/i })
      .or(page.getByRole('link', { name: /sign in|log in/i }))
      .first();
    await expect(signIn).toBeVisible({ timeout: 15000 });
    const box = (await signIn.boundingBox())!;
    const ownsCenter = await page.evaluate(
      ([x, y]) => !!document.elementFromPoint(x, y)?.closest('a,button'),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(ownsCenter, 'sign-in affordance is occluded at its center').toBe(true);
  });

  /**
   * EXPECTED TO FAIL while guest chat is broken upstream.
   *
   * The K8s secret chat-guest-key/API_KEY currently holds a copy of
   * chat-secrets/OPENAI_API_KEY (verified identical by sha256), not the
   * `hk-<uuid>` IAM accessKey that operator/crs/chat-guest-key-kms-sync.yaml
   * documents, so the gateway answers "invalid API key" and no tokens ever
   * arrive. `test.fail()` makes that state loud instead of silent: when the KMS
   * path is reseeded this test starts PASSING, Playwright reports "expected to
   * fail but passed", and whoever fixed it deletes this annotation.
   *
   * The assertion is growth across samples, because one blob at t≈1100ms and a
   * real stream are indistinguishable by status code — that difference is
   * exactly what caught this.
   */
  test('streams tokens incrementally rather than one instant blob', async ({ page }) => {
    test.fail(); // scoped to THIS test — see the note above.
    const composer = await openGuestChat(page);
    await composer.fill('Count slowly from one to twenty.');
    await composer.press('Enter');

    const lengths: number[] = [];
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      lengths.push((await page.locator('body').innerText()).length);
    }

    // Distinct increases, not one jump: a stream grows repeatedly.
    let steps = 0;
    for (let i = 1; i < lengths.length; i++) {
      if (lengths[i] > lengths[i - 1]) steps++;
    }
    expect(steps, `text grew in ${steps} step(s); a stream grows across many`).toBeGreaterThan(2);
  });

  /**
   * The footer must OCCUPY space, not cover its neighbours.
   *
   * `pointer-events-none` stopped the strip eating clicks, but pointer-events
   * cannot move a box: it still painted over "New search" (a ~9px vertical
   * intersection) and rendered as collided text. Laying it out in flow fixes
   * that, and only a numeric rect check can prove it stayed fixed.
   */
  test('footer occupies its own space and intersects nothing', async ({ page }) => {
    await openGuestChat(page);

    const collisions = await page.evaluate(() => {
      const footer = document.querySelector('[role="contentinfo"]');
      if (!footer) return { found: false, hits: [] as string[] };
      const fr = footer.getBoundingClientRect();
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll('button, a, textarea, h1, h2, p'))) {
        if (footer.contains(el) || el.contains(footer)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const y = Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top);
        const x = Math.min(fr.right, r.right) - Math.max(fr.left, r.left);
        if (y > 0 && x > 0) {
          hits.push(`${el.tagName.toLowerCase()}"${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(y)}px`);
        }
      }
      return { found: true, hits };
    });

    expect(collisions.found, 'no footer rendered').toBe(true);
    expect(collisions.hits, `footer overlaps: ${collisions.hits.join(', ')}`).toEqual([]);
  });

  /** A loading skeleton that can never resolve is an empty box, not a promise. */
  test('sidebar shows no permanently-empty bordered box', async ({ page }) => {
    await openGuestChat(page);
    await page.waitForTimeout(6000); // well past any real settle

    const ghosts = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return [];
      const out: string[] = [];
      for (const el of Array.from(nav.querySelectorAll('div, input, form'))) {
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 20 || r.height > 80) continue;
        const cs = getComputedStyle(el);
        const bordered =
          parseFloat(cs.borderTopWidth) > 0 ||
          (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
        if (!bordered) continue;
        if ((el.textContent || '').trim() !== '') continue;
        if (el.querySelector('svg, img, input, textarea')) continue;
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    });

    expect(ghosts, `empty bordered box(es) in the sidebar: ${ghosts.join(' | ')}`).toEqual([]);
  });
});
