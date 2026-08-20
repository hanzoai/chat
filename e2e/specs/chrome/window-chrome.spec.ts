import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The window chrome, measured — not reviewed.
 *
 * Every number below is also written in `client/src/components/Chat/chrome.ts`,
 * which is chat's expression of the same spec `hanzo-desktop`'s
 * `src/hanzo/theme.ts` states in gui props. Classes do not transfer between the
 * two surfaces; the DECISIONS do, and these are them:
 *
 *   - every square in the chrome cluster is 44×44 (Apple HIG 44pt / WCAG 2.5.5)
 *   - ONE focus indicator for the whole chrome — a control that hand-rolls its
 *     box does not lose its ring, it falls back to the UA's, which is how one
 *     row acquires two
 *   - menu rows are the chrome square tall and hang off the trigger's RIGHT edge
 *   - the strip's height is a BUDGET, so its buttons are BLED into it
 *   - the seam paints ONE 1px rule with an 8px grab band centred on it
 *   - the shortcut is a rung under the label and still clears WCAG AA
 *
 * A green `vite build` proves none of it: chat silently drops a class it does
 * not generate exactly as gui silently drops a prop it does not recognise.
 */

test.use({ viewport: { width: 1440, height: 900 } });

/** The chrome's ONE square, and the row's margin around it. */
const CHROME_CONTROL = 44;
/** Corner rounding for chrome squares and menu rows. */
const CHROME_RADIUS = '10px';
/** Panels — the menu's own box. */
const PANEL_RADIUS = '12px';
/** A tab's close button: under the 44 floor, over the 24 one (WCAG 2.5.8). */
const TAB_CLOSE = 24;
/** The strip's largest square, and the margin box its budget actually spends. */
const STRIP_BUTTON = 40;
const STRIP_BUDGET = 32;

type Box = {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  radius: string;
  /** Border box plus margins — what the layout around it actually spends. */
  mW: number;
  mH: number;
  /** Content box, i.e. what the padding leaves for the controls inside. */
  innerH: number;
};

async function box(page: Page, selector: string, nth = 0): Promise<Box> {
  return page.evaluate(
    ({ selector, nth }) => {
      const el = document.querySelectorAll(selector)[nth] as HTMLElement | undefined;
      if (!el) {
        throw new Error(`no element for ${selector}[${nth}]`);
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const px = (v: string) => parseFloat(v) || 0;
      const round = (v: number) => Math.round(v * 100) / 100;
      return {
        w: round(r.width),
        h: round(r.height),
        left: round(r.left),
        right: round(r.right),
        top: round(r.top),
        bottom: round(r.bottom),
        radius: cs.borderTopLeftRadius,
        mW: round(r.width + px(cs.marginLeft) + px(cs.marginRight)),
        mH: round(r.height + px(cs.marginTop) + px(cs.marginBottom)),
        innerH: round(
          r.height -
            px(cs.paddingTop) -
            px(cs.paddingBottom) -
            px(cs.borderTopWidth) -
            px(cs.borderBottomWidth),
        ),
      };
    },
    { selector, nth },
  );
}

type Ring = { focusVisible: boolean; outline: string; boxShadow: string };

/**
 * `window.readRing` — installed into every page so the two readings below are
 * literally the same code.
 *
 * A box-shadow whose every length is `0px` PAINTS NOTHING, whatever colour it
 * names, so it is normalised to `none`. Without that, three controls wearing
 * one visible indicator still compare as three: Tailwind leaves the stood-down
 * `--tw-ring-*` colours in the computed value (`rgb(20,20,20) 0 0 0 0` on a
 * Button, `rgba(89,89,89,.5) 0 0 0 0` on the Ariakit trigger) and only the
 * lengths say whether anything is drawn.
 */
const INSTALL_READ_RING = () => {
  (window as unknown as { readRing: (el: HTMLElement) => unknown }).readRing = (
    el: HTMLElement,
  ) => {
    const cs = getComputedStyle(el);
    const shadow = cs.boxShadow;
    const paints =
      shadow !== 'none' &&
      shadow
        .replace(/rgba?\([^)]*\)/g, '')
        .split(',')
        .some((part) =>
          part
            .trim()
            .split(/\s+/)
            .some((value) => value !== '' && parseFloat(value) !== 0),
        );
    return {
      focusVisible: el.matches(':focus-visible') || el.hasAttribute('data-focus-visible'),
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor} offset ${cs.outlineOffset}`,
      boxShadow: paints ? shadow : 'none',
    };
  };
};

async function ring(page: Page, selector: string, nth = 0): Promise<Ring> {
  return page.evaluate(
    ({ selector, nth }) => {
      const el = document.querySelectorAll(selector)[nth] as HTMLElement | undefined;
      if (!el) {
        throw new Error(`no element for ${selector}[${nth}]`);
      }
      el.focus();
      return (window as unknown as { readRing: (el: HTMLElement) => Ring }).readRing(el);
    },
    { selector, nth },
  );
}

/** The same reading, taken off whatever the keyboard actually focused. */
async function ringOfActive(page: Page): Promise<Ring & { role: string | null }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) {
      throw new Error('nothing is focused');
    }
    return {
      ...(window as unknown as { readRing: (el: HTMLElement) => Ring }).readRing(el),
      role: el.getAttribute('role'),
    };
  });
}

/** Contrast of an element's text against the surface it is actually painted on. */
async function contrast(page: Page, selector: string, nth = 0): Promise<number> {
  return page.evaluate(
    ({ selector, nth }) => {
      const el = document.querySelectorAll(selector)[nth] as HTMLElement | undefined;
      if (!el) {
        throw new Error(`no element for ${selector}[${nth}]`);
      }
      const parse = (c: string): [number, number, number, number] => {
        const n = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
        return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1];
      };
      /* Composite every translucent surface between the text and the page. */
      let bg: [number, number, number] = [0, 0, 0];
      const stack: [number, number, number, number][] = [];
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const [r, g, b, a] = parse(getComputedStyle(node).backgroundColor);
        if (a > 0) {
          stack.push([r, g, b, a]);
        }
        if (a === 1) {
          break;
        }
      }
      const [br, bgc, bb] = parse(getComputedStyle(document.body).backgroundColor);
      bg = [br, bgc, bb];
      for (let i = stack.length - 1; i >= 0; i--) {
        const [r, g, b, a] = stack[i];
        bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
      }
      const [fr, fg, fb, fa] = parse(getComputedStyle(el).color);
      const fg3: [number, number, number] = [
        fr * fa + bg[0] * (1 - fa),
        fg * fa + bg[1] * (1 - fa),
        fb * fa + bg[2] * (1 - fa),
      ];
      const lum = ([r, g, b]: [number, number, number]) => {
        const c = [r, g, b].map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const l1 = lum(fg3);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return Math.round(ratio * 100) / 100;
    },
    { selector, nth },
  );
}

const CLUSTER = [
  '[data-testid="maximize-chat-space"]',
  '[data-testid="companions-menu"]',
  '[data-testid="toggle-side-panel"]',
];

async function land(page: Page) {
  await page.addInitScript(INSTALL_READ_RING);
  await page.addInitScript(() => {
    /* Without this the signed-out SSO probe navigates the document to hanzo.id
       mid-run and every spec in the file reads as a regression. */
    sessionStorage.setItem('hanzo.sso.probed', '1');
    localStorage.setItem('navVisible', 'true');
    /* The ambient backdrop is a third-party YouTube embed. It paints nothing
       this suite measures and it makes every page load wait on a network this
       suite does not control. */
    localStorage.setItem('showBackdrop', 'false');
    /* Panels persist, so a previous spec's bar must not decide this one's. */
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('panel:')) {
        localStorage.removeItem(key);
      }
    }
  });
  await page.goto('/c/new', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByTestId('header-actions')).toBeVisible({ timeout: 30000 });
}

/**
 * Open the companions menu and wait for it to SETTLE.
 *
 * `.popover-ui` opens through a 150ms `opacity`/`scale`/`translate` transition
 * from `scale: 0.95`, so a measurement taken the moment the panel is visible
 * reads every number 5% small and the panel's right edge 5.2px inside the
 * trigger's — a misalignment that does not exist. Measured before this wait:
 * panel 197.6 wide (208 × 0.95), row 41.8 tall (44 × 0.95), icon slot 15.2
 * (16 × 0.95). The animation is the measurement's problem, not the layout's.
 */
async function openMenu(page: Page) {
  await page.getByTestId('companions-menu').click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector('[role="menu"]') as HTMLElement | null;
    if (!el) {
      return false;
    }
    const cs = getComputedStyle(el);
    return cs.opacity === '1' && (cs.scale === '1' || cs.scale === 'none');
  });
}

/** Open the companions menu and dock a Browser tab through it. */
async function openBar(page: Page) {
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Browser' }).click();
  await expect(page.getByRole('tablist', { name: 'Bottom bar' })).toBeVisible();
}

test.describe('window chrome', () => {
  test('the cluster is three 44×44 squares in a row that has room for them', async ({ page }) => {
    await land(page);

    const row = await box(page, '[data-testid="header-actions"]');
    const header = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="header-actions"]')?.closest('.absolute') as
        | HTMLElement
        | undefined;
      if (!el) {
        throw new Error('no header strip');
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const px = (v: string) => parseFloat(v) || 0;
      return {
        h: Math.round(r.height * 100) / 100,
        innerH: Math.round((r.height - px(cs.paddingTop) - px(cs.paddingBottom)) * 100) / 100,
      };
    });
    const squares: Box[] = [];
    for (const sel of CLUSTER) {
      squares.push(await box(page, sel));
    }

    console.log('CHROME ROW', JSON.stringify({ header, actions: row }));
    console.log('CLUSTER', JSON.stringify(squares));

    for (const square of squares) {
      expect(square.w).toBe(CHROME_CONTROL);
      expect(square.h).toBe(CHROME_CONTROL);
      expect(square.radius).toBe(CHROME_RADIUS);
    }
    /* The row's padding box must FIT the square it carries. At `p-2` on an
       `h-14` strip it was 40 and the cluster overhung its own padding. */
    expect(header.innerH).toBeGreaterThanOrEqual(CHROME_CONTROL);
  });

  test('the whole chrome paints ONE focus indicator', async ({ page }) => {
    await land(page);
    await openBar(page);
    /* Establish keyboard modality so script focus matches :focus-visible. */
    await page.keyboard.press('Tab');

    const probes: Record<string, Ring> = {
      maximize: await ring(page, CLUSTER[0]),
      companions: await ring(page, CLUSTER[1]),
      sidePanel: await ring(page, CLUSTER[2]),
      stripNewTab: await ring(page, '[data-testid="bottom-bar-new-tab"]'),
      stripClose: await ring(page, '[data-testid="bottom-bar-close"]'),
      tab: await ring(page, '[role="tab"]'),
      tabClose: await ring(page, '[data-testid^="bottom-bar-tab-close-"]'),
      seam: await ring(page, '[data-panel-resize-handle-id]'),
    };

    /* The menu row is only mounted while the menu is open — and it has to be
       opened from the KEYBOARD. Script focus only takes `:focus-visible` while
       the last interaction was a keypress, so a row reached after clicking the
       trigger reports no focus state at all and the reading is of an unfocused
       row. Enter opens the menu and Ariakit moves focus into it. */
    await page.getByTestId('companions-menu').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    const row = await ringOfActive(page);
    expect(row.role, 'the keyboard did not land on a menu row').toBe('menuitem');
    probes.menuRow = { ...row };
    await page.keyboard.press('Escape');

    console.log('FOCUS', JSON.stringify(probes, null, 2));

    for (const [name, probe] of Object.entries(probes)) {
      expect(probe.focusVisible, `${name} did not take focus-visible`).toBe(true);
    }
    const painted = Object.values(probes).map((p) => `${p.outline} | shadow ${p.boxShadow}`);
    expect(
      new Set(painted).size,
      `chrome paints ${new Set(painted).size} focus indicators:\n${[...new Set(painted)].join('\n')}`,
    ).toBe(1);
    /* And the one it paints is an OUTLINE, not a ring-shaped box-shadow: a
       box-shadow ring is clipped by any ancestor that scrolls. */
    expect(painted[0]).toMatch(/^2px solid .+ offset 2px \| shadow none$/);

    /* One indicator is only worth having if it can be SEEN. `--ring` is
       translucent white, so its contrast is a property of what it is painted
       over — composited here against the page rather than assumed. WCAG 1.4.11
       wants 3:1 for a non-text indicator. */
    const ringContrast = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="maximize-chat-space"]') as HTMLElement;
      /* FOCUS it first. `outline-color` on an unfocused control is the initial
         `currentColor`, i.e. the label — reading that reported 17.78:1 for a
         ring nobody was looking at. Escape was the last keypress, so script
         focus still takes `:focus-visible` here. */
      el.focus();
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0', '1']).map(Number);
      const [pr, pg, pb] = parse(getComputedStyle(document.body).backgroundColor);
      const [rr, rg, rb, ra = 1] = parse(getComputedStyle(el).outlineColor);
      const over = [rr * ra + pr * (1 - ra), rg * ra + pg * (1 - ra), rb * ra + pb * (1 - ra)];
      const lum = (rgb: number[]) =>
        0.2126 * chan(rgb[0]) + 0.7152 * chan(rgb[1]) + 0.0722 * chan(rgb[2]);
      function chan(v: number) {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      }
      const a = lum(over);
      const b = lum([pr, pg, pb]);
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    });
    console.log('RING CONTRAST', ringContrast);
    expect(ringContrast).toBeGreaterThanOrEqual(3);
  });

  test('menu rows are the chrome square tall and hang off the trigger’s right edge', async ({
    page,
  }) => {
    await land(page);
    const trigger = await box(page, '[data-testid="companions-menu"]');
    await openMenu(page);

    const panel = await box(page, '[role="menu"]');
    const row = await box(page, '[role="menuitem"]');
    const iconSlot = await box(page, '[role="menuitem"] > span[aria-hidden="true"]');
    const kbd = await box(page, '[role="menuitem"] kbd');

    console.log(
      'MENU',
      JSON.stringify({ trigger: trigger.right, panel, row, iconSlot, kbd }, null, 2),
    );

    expect(row.h).toBe(CHROME_CONTROL);
    expect(row.radius).toBe(CHROME_RADIUS);
    expect(panel.radius).toBe(PANEL_RADIUS);
    expect(iconSlot.w).toBe(16);
    expect(iconSlot.h).toBe(16);
    /* Right-aligned to the trigger, to the pixel. */
    expect(Math.abs(panel.right - trigger.right)).toBeLessThanOrEqual(0.5);
    /* And the row fills the panel it sits in. */
    expect(panel.right - row.right).toBeLessThanOrEqual(9);
  });

  test('the shortcut is a rung under the label and still clears WCAG AA', async ({ page }) => {
    await land(page);
    await openMenu(page);

    const kbd = await contrast(page, '[role="menuitem"] kbd');
    const label = await contrast(page, '[role="menuitem"]');
    const size = await page.evaluate(
      () => getComputedStyle(document.querySelector('[role="menuitem"] kbd')!).fontSize,
    );

    console.log('SHORTCUT', JSON.stringify({ kbd, label, size }));

    expect(size).toBe('12px');
    expect(kbd).toBeGreaterThanOrEqual(4.5);
    /* A rung UNDER the label — same rung would read as a second label. */
    expect(kbd).toBeLessThan(label);
  });

  test('every control in the strip is bled into the strip’s budget', async ({ page }) => {
    await land(page);
    await openBar(page);

    const strip = await box(page, '[role="tablist"][aria-label="Bottom bar"]');
    const newTab = await box(page, '[data-testid="bottom-bar-new-tab"]');
    const close = await box(page, '[data-testid="bottom-bar-close"]');
    const tab = await box(page, '[role="tab"]');
    const tabClose = await box(page, '[data-testid^="bottom-bar-tab-close-"]');

    console.log('STRIP', JSON.stringify({ strip, newTab, close, tab, tabClose }, null, 2));

    for (const button of [newTab, close]) {
      expect(button.w).toBe(STRIP_BUTTON);
      expect(button.h).toBe(STRIP_BUTTON);
      /* Bled back: the box the pointer hits is 40, the box the strip pays for
         is 32 — which is what keeps the strip at its budget. */
      expect(button.mH).toBe(STRIP_BUDGET);
      expect(button.radius).toBe(CHROME_RADIUS);
    }
    expect(tabClose.w).toBe(TAB_CLOSE);
    expect(tabClose.h).toBe(TAB_CLOSE);
    expect(tabClose.mW).toBe(TAB_CLOSE - 4);
    expect(tabClose.radius).toBe('6px');
    expect(tab.radius).toBe(CHROME_RADIUS);
    /* 32 content + 4+4 padding + the 1px rule. */
    expect(strip.h).toBe(41);
  });

  test('the seam is ONE 1px rule under an 8px grab band, with no chip on it', async ({ page }) => {
    await land(page);
    await openBar(page);

    const seam = await page.evaluate(() => {
      const handle = document.querySelector('[data-panel-resize-handle-id]') as HTMLElement;
      const r = handle.getBoundingClientRect();
      const after = getComputedStyle(handle, '::after');
      const probes: string[] = [];
      const mid = Math.round(r.left + r.width / 2);
      for (const dy of [-3, -1, 0, 1, 3]) {
        const el = document.elementFromPoint(mid, Math.round(r.top) + dy);
        probes.push(el === handle ? 'handle' : (el?.tagName.toLowerCase() ?? 'null'));
      }
      /* A hairline stacked on a hairline reads as one thick, blurry edge, so
         count every painted border across the seam, not just the handle's. */
      const bar = document.getElementById('bottom-bar');
      const px = (v: string) => parseFloat(v) || 0;
      return {
        handleH: Math.round(r.height * 100) / 100,
        grabH: after.height,
        chips: handle.children.length,
        probes,
        barBorderTop: bar ? px(getComputedStyle(bar).borderTopWidth) : -1,
      };
    });

    console.log('SEAM', JSON.stringify(seam));

    expect(seam.handleH).toBe(1);
    expect(seam.grabH).toBe('8px');
    /* No grip chip: desktop's seam carries no mark of its own, and a visible
       chip is a second thing to aim at on a 1px rule. */
    expect(seam.chips).toBe(0);
    expect(seam.barBorderTop).toBe(0);
    expect(seam.probes).toEqual(['handle', 'handle', 'handle', 'handle', 'handle']);

    /* Taking the chip out must not take the DRAG out with it: the band is the
       handle's own `::after`, so the pointer still lands on the handle — but
       the only way to know that is to pull the seam and watch the bar move. */
    const handle = await page.locator('[data-panel-resize-handle-id]').boundingBox();
    const before = await box(page, '#bottom-bar');
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y);
    await page.mouse.down();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y - 120, { steps: 12 });
    await page.mouse.up();
    const after = await box(page, '#bottom-bar');

    console.log('DRAG', JSON.stringify({ from: before.h, to: after.h }));
    expect(after.h).toBeGreaterThan(before.h + 100);
  });
  /**
   * The rail holds 56 and DRAWS 260, and those are two different measurements.
   *
   * This is the whole reason hover-to-open is allowed here. A rail that widens
   * IN FLOW slides the page sideways because a pointer crossed it — out from
   * under whatever that pointer was reaching for — and this repo threw one of
   * those away for exactly that reason. Floating the peek over the conversation
   * costs the page no motion, so the objection is answered rather than
   * overruled, and the composer's centre is what proves it: it must not move by
   * a single pixel between rest and peek.
   *
   * Pinning is the opposite and must stay so. It reflows, live, without a
   * reload — a deliberate act, whose feedback is the movement.
   */
  test('the rail peeks over the conversation and pins into it', async ({ page }) => {
    await page.goto('/c/new');
    await page.waitForSelector('[data-testid="nav"]');

    const read = () =>
      page.evaluate(() => {
        const nav = document.querySelector('[data-testid="nav"]') as HTMLElement;
        const held = nav.parentElement as HTMLElement;
        const ta = document.querySelector('textarea') as HTMLElement;
        const mid = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return Math.round(r.x + r.width / 2);
        };
        return {
          shown: Math.round(nav.getBoundingClientRect().width),
          held: Math.round(held.getBoundingClientRect().width),
          composer: mid(ta),
        };
      });

    /* Shut on the first visit, at every width — the rail, not the column. */
    const rest = await read();
    expect(rest.shown).toBe(56);
    expect(rest.held).toBe(56);

    await page.mouse.move(28, 450);
    await expect
      .poll(async () => (await read()).shown, { timeout: 2000 })
      .toBe(260);
    const peek = await read();
    console.log('RAIL', JSON.stringify({ rest, peek }));

    /* Drawn wide, holding narrow — and the page did not move. */
    expect(peek.held).toBe(56);
    expect(peek.composer).toBe(rest.composer);

    await page.mouse.move(1000, 450);
    await expect
      .poll(async () => (await read()).shown, { timeout: 2000 })
      .toBe(56);

    /* Pinning reflows, live. The toggle sits INSIDE the nav, so the pointer has
       to leave afterwards or a peek reads as a pin and the test proves nothing. */
    await page.getByTestId('open-sidebar-button').click();
    await page.mouse.move(1000, 450);
    await expect
      .poll(async () => (await read()).held, { timeout: 2000 })
      .toBe(260);
    const pinned = await read();
    console.log('PINNED', JSON.stringify(pinned));
    expect(pinned.composer).toBeGreaterThan(rest.composer);
  });
});
