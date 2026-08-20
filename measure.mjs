/**
 * Pixel-parity instrument for the Nav conversion pilot.
 *
 * Reads computed style + box for every element the conversion touches, at both
 * breakpoints, plus the hover ground (which is a real utility being converted and
 * so has to be proven too). Writes one JSON per phase so before/after diff cleanly.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.PROBE_URL || 'http://127.0.0.1:5200';
const PHASE = process.env.PHASE || 'before';
const OUT = process.env.OUT || `/dev/shm/gotmp/claude-1000/-home-z/07ff2e34-435d-408d-a848-5c3b622c4950/scratchpad/${PHASE}`;

/** Every property the brief asks for, plus the ones that silently carry layout. */
const PROPS = [
  'font-size',
  'line-height',
  'border-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'background-color',
  'color',
  'font-family',
  'font-style',
  'display',
  'flex-direction',
  'align-items',
  'justify-content',
  'gap',
  'row-gap',
  'width',
  'height',
  'min-height',
  'min-width',
  'flex-shrink',
  'text-align',
  'text-overflow',
  'white-space',
  'overflow-x',
  'transition-property',
  'transition-duration',
  'letter-spacing',
  'font-weight',
];

const TARGETS = [
  ['column', '#harness-column'],
  ['rail-wrapper', '#harness-column > div:first-child'],
  ['row-projects', '[data-testid="nav-projects-button"]'],
  ['row-sites-ACTIVE', '[data-testid="nav-sites-button"]'],
  ['row-scheduled', '[data-testid="nav-scheduled-button"]'],
  ['row-plugins', '[data-testid="nav-plugins-button"]'],
  ['icon-projects', '[data-testid="nav-projects-button"] svg'],
  ['signature', '[data-testid="nav-signature"]'],
];

const browser = await chromium.launch();
const result = { phase: PHASE, viewports: {} };
const consoleErrors = [];

for (const vw of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
  page.on('console', (m) => {
    const t = m.text();
    // The dropped-text-node warning is exactly the failure mode this pilot must catch.
    if (m.type() === 'error' || /Unexpected text node/.test(t)) {
      consoleErrors.push(`[${vw}] ${t.slice(0, 300)}`);
    }
  });

  await page.goto(`${BASE}/harness.html`, { waitUntil: 'commit', timeout: 180000 });
  await page.waitForSelector('[data-testid="nav-projects-button"]', { timeout: 180000 });
  await page.waitForSelector('[data-testid="nav-signature"]', { timeout: 180000 });
  // Fonts settle before any type measurement, or line-height reads the fallback face.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const measured = await page.evaluate(
    ({ targets, props }) => {
      const out = {};
      for (const [name, sel] of targets) {
        const el = document.querySelector(sel);
        if (!el) {
          out[name] = { MISSING: sel };
          continue;
        }
        const cs = getComputedStyle(el);
        const style = {};
        for (const p of props) style[p] = cs.getPropertyValue(p);
        const r = el.getBoundingClientRect();
        out[name] = {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 60),
          style,
          box: {
            x: +r.x.toFixed(2),
            y: +r.y.toFixed(2),
            w: +r.width.toFixed(2),
            h: +r.height.toFixed(2),
          },
        };
      }
      return out;
    },
    { targets: TARGETS, props: PROPS },
  );

  /**
   * The row's label is a BARE TEXT NODE before the conversion and a <span> after,
   * so there is no single selector that reads both. A Range over the last child
   * node measures the painted glyphs either way — which is the only thing that
   * makes "the text did not move, and did not vanish" a checkable claim.
   */
  const label = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="nav-projects-button"]');
    const last = row.lastChild;
    const range = document.createRange();
    range.selectNodeContents(last);
    const r = range.getBoundingClientRect();
    const host = last.nodeType === 3 ? last.parentElement : last;
    const cs = getComputedStyle(host);
    return {
      nodeKind: last.nodeType === 3 ? 'text-node' : last.nodeName.toLowerCase(),
      text: (last.textContent || '').trim(),
      style: {
        'font-size': cs.fontSize,
        'line-height': cs.lineHeight,
        color: cs.color,
        'font-family': cs.fontFamily,
        'font-weight': cs.fontWeight,
      },
      box: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
    };
  });
  measured['label-projects'] = label;

  // The hover ground is a converted utility, so measure it rather than trust it.
  await page.hover('[data-testid="nav-projects-button"]');
  await page.waitForTimeout(400);
  const hover = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="nav-projects-button"]');
    return { 'background-color': getComputedStyle(el).backgroundColor };
  });
  measured['row-projects-HOVER'] = { style: hover };

  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}-${vw}.png`, fullPage: false });

  /**
   * The row's handler moved from `onClick` to gui's `onPress`, so the click has
   * to be proven rather than assumed: a row that no longer navigates is a far
   * worse regression than one that shifted a pixel. `/sites` starts active; a
   * click on Projects must move `aria-current`.
   */
  const before = await page.getAttribute('[data-testid="nav-sites-button"]', 'aria-current');
  await page.click('[data-testid="nav-projects-button"]');
  await page.waitForTimeout(500);
  measured['CLICK-navigates'] = {
    sitesAriaCurrentBefore: before,
    sitesAriaCurrentAfter: await page.getAttribute('[data-testid="nav-sites-button"]', 'aria-current'),
    projectsAriaCurrentAfter: await page.getAttribute(
      '[data-testid="nav-projects-button"]',
      'aria-current',
    ),
  };
  // The title attribute is the signature's only affordance for the full string.
  measured['signature-title'] = {
    title: await page.getAttribute('[data-testid="nav-signature"]', 'title'),
  };

  result.viewports[vw] = measured;
  await page.close();
}

result.consoleErrors = consoleErrors;
writeFileSync(`${OUT}.json`, JSON.stringify(result, null, 2));
console.log(`wrote ${OUT}.json`);
console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');
await browser.close();
