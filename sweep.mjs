import { chromium } from 'playwright';

/**
 * Responsive sweep of the chat landing across real device classes.
 *
 * The ambient backdrop is an iframe deliberately sized past the viewport
 * (cover math + 1.4 overscan) inside an overflow-hidden layer, so it is
 * excluded everywhere — counting it would report overflow at every width.
 */
const URL = 'http://localhost:5220/c/new';

const VIEWPORTS = [
  { key: 'mobile-small', w: 360, h: 740, touch: true },
  { key: 'mobile', w: 390, h: 844, touch: true },
  { key: 'tablet-portrait', w: 768, h: 1024, touch: true },
  { key: 'tablet-landscape', w: 1024, h: 768, touch: true },
  { key: 'laptop', w: 1440, h: 900, touch: false },
  { key: 'desktop', w: 1920, h: 1080, touch: false },
  { key: 'wide', w: 2560, h: 1440, touch: false },
];

const browser = await chromium.launch();
const out = [];

for (const v of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: v.w, height: v.h },
    isMobile: v.touch,
    hasTouch: v.touch,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  const measure = () =>
    page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const H = document.documentElement.clientHeight;
      const vis = (e) => {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      // Anything inside the backdrop layer is scenery, not layout.
      const scenery = (e) => !!e.closest('[aria-hidden="true"]') || e.tagName === 'IFRAME';

      const controls = [...document.querySelectorAll('button,a,[role=tab],input,textarea')]
        .filter(vis)
        .filter((e) => !scenery(e))
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            label: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            font: Math.round(parseFloat(getComputedStyle(e).fontSize)),
          };
        });

      const field = document.querySelector('.field');
      const fr = field ? field.getBoundingClientRect() : null;
      const nav = document.querySelector('nav') || document.getElementById('chat-history-nav');
      const nr = nav ? nav.getBoundingClientRect() : null;

      // Overflow: widest real element right-edge, scenery excluded.
      let widest = 0, culprit = '';
      for (const e of document.querySelectorAll('*')) {
        if (!vis(e) || scenery(e)) continue;
        const r = e.getBoundingClientRect();
        if (r.right > widest) { widest = r.right; culprit = e.tagName + '.' + String(e.className).slice(0, 40); }
      }

      return {
        W, H,
        scrollW: document.documentElement.scrollWidth,
        widest: Math.round(widest), culprit,
        field: fr ? { x: Math.round(fr.x), y: Math.round(fr.y), w: Math.round(fr.width), h: Math.round(fr.height) } : null,
        nav: nr ? { x: Math.round(nr.x), y: Math.round(nr.y), w: Math.round(nr.width) } : null,
        controls,
      };
    });

  const base = await measure();

  // Composer stability across whatever mode tabs exist.
  const ys = [];
  for (const tab of ['Chat', 'Search', 'News', 'Research']) {
    const t = page.locator('button', { hasText: new RegExp(`^${tab}$`) }).first();
    if (await t.count()) {
      await t.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      const f = page.locator('.field').first();
      if (await f.count()) { const b = await f.boundingBox(); if (b) ys.push({ tab, y: Math.round(b.y) }); }
    }
  }
  const spread = ys.length > 1 ? Math.max(...ys.map((a) => a.y)) - Math.min(...ys.map((a) => a.y)) : 0;

  // Defects.
  const d = [];
  if (base.scrollW > base.W + 1) d.push(`horizontal overflow: scrollWidth ${base.scrollW} > ${base.W}`);
  if (base.widest > base.W + 1) d.push(`element past right edge: ${base.widest} > ${base.W} (${base.culprit})`);
  if (!base.field) d.push('composer (.field) not found');
  else {
    if (base.field.x < 0 || base.field.x + base.field.w > base.W + 1)
      d.push(`composer outside viewport horizontally: x=${base.field.x} w=${base.field.w} vs W=${base.W}`);
    if (base.field.y + base.field.h > base.H + 1)
      d.push(`composer bottom past viewport: ${base.field.y + base.field.h} > ${base.H}`);
  }
  if (spread > 2) d.push(`composer moves ${spread}px across mode tabs: ${JSON.stringify(ys)}`);
  for (const c of base.controls) {
    if (c.x < -1 || c.y < -1) d.push(`control off-screen: "${c.label}" at ${c.x},${c.y}`);
    if (c.x + c.w > base.W + 1) d.push(`control past right edge: "${c.label}" right=${c.x + c.w} > ${base.W}`);
    if (v.touch && (c.w < 44 || c.h < 44)) d.push(`tap target < 44px: "${c.label}" ${c.w}x${c.h}`);
    if (c.font && c.font < 11) d.push(`font < 11px: "${c.label}" ${c.font}px`);
  }
  // Overlap between interactive controls.
  for (let i = 0; i < base.controls.length; i++)
    for (let j = i + 1; j < base.controls.length; j++) {
      const a = base.controls[i], b = base.controls[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 2 && oy > 2) d.push(`overlap: "${a.label}" and "${b.label}" by ${ox}x${oy}px`);
    }
  if (errors.length) d.push(`pageerror: ${errors[0]}`);

  out.push({ viewport: v.key, size: `${v.w}x${v.h}`, nav: base.nav, field: base.field, spread, defects: [...new Set(d)] });
  await page.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
