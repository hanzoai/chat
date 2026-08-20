import { chromium } from '@playwright/test';

const URL = 'http://localhost:5220/c/new';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 740 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

const result = await page.evaluate(() => {
  const out = {};
  out.viewport = { innerWidth: innerWidth, innerHeight: innerHeight, dpr: devicePixelRatio };
  out.doc = { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };

  const all = [...document.querySelectorAll('button,[role="button"],a,input,select,textarea')];
  const cands = all.filter((e) => {
    const al = (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('data-testid') || '');
    return /temporary/i.test(al);
  });

  out.candidateCount = cands.length;
  out.candidates = cands.map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const bef = getComputedStyle(el, '::before');
    const aft = getComputedStyle(el, '::after');
    return {
      tag: el.tagName,
      ariaLabel: el.getAttribute('aria-label'),
      className: String(el.className.baseVal !== undefined ? el.className.baseVal : el.className),
      rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) },
      offset: { w: el.offsetWidth, h: el.offsetHeight },
      computed: {
        display: cs.display, width: cs.width, height: cs.height,
        minWidth: cs.minWidth, minHeight: cs.minHeight,
        padding: cs.padding, margin: cs.margin,
        visibility: cs.visibility, opacity: cs.opacity,
        pointerEvents: cs.pointerEvents, position: cs.position, touchAction: cs.touchAction,
        alignSelf: cs.alignSelf, flex: cs.flex,
      },
      pseudo: {
        before: { content: bef.content, w: bef.width, h: bef.height, pos: bef.position, inset: [bef.top, bef.right, bef.bottom, bef.left].join(' ') },
        after: { content: aft.content, w: aft.width, h: aft.height, pos: aft.position, inset: [aft.top, aft.right, aft.bottom, aft.left].join(' ') },
      },
      parent: (() => {
        const p = el.parentElement; if (!p) return null;
        const pr = p.getBoundingClientRect(); const pcs = getComputedStyle(p);
        return { tag: p.tagName, cls: String(p.className).slice(0, 90), rect: { x: +pr.x.toFixed(1), y: +pr.y.toFixed(1), w: +pr.width.toFixed(1), h: +pr.height.toFixed(1), right: +pr.right.toFixed(1) }, display: pcs.display, gap: pcs.gap, padding: pcs.padding, alignItems: pcs.alignItems };
      })(),
    };
  });

  // hit test at center + at the 4 corners inset 2px
  out.hitTests = cands.map((el) => {
    const r = el.getBoundingClientRect();
    const pts = {
      center: [r.x + r.width / 2, r.y + r.height / 2],
      tl: [r.left + 2, r.top + 2], tr: [r.right - 2, r.top + 2],
      bl: [r.left + 2, r.bottom - 2], br: [r.right - 2, r.bottom - 2],
    };
    const res = {};
    for (const [k, [x, y]] of Object.entries(pts)) {
      const t = document.elementFromPoint(x, y);
      res[k] = { pt: [+x.toFixed(1), +y.toFixed(1)], hits: !!(t && (t === el || el.contains(t))), top: t ? t.tagName + '.' + String(t.className).slice(0, 40) : null };
    }
    return res;
  });

  // neighbor spacing (WCAG 2.5.8 spacing exception)
  if (cands.length) {
    const el = cands[0];
    const r = el.getBoundingClientRect();
    const vis = all.filter((e) => {
      if (e === el || el.contains(e) || e.contains(el)) return false;
      const q = e.getBoundingClientRect();
      if (q.width === 0 || q.height === 0) return false;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return false;
      return q.right > 0 && q.left < innerWidth && q.bottom > 0 && q.top < innerHeight;
    });
    const gap = (a, b) => {
      const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
      const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
      return Math.hypot(dx, dy);
    };
    out.neighbors = vis.map((e) => {
      const q = e.getBoundingClientRect();
      return { label: (e.getAttribute('aria-label') || (e.textContent || '').trim().slice(0, 24) || e.tagName), rect: { x: +q.x.toFixed(1), y: +q.y.toFixed(1), w: +q.width.toFixed(1), h: +q.height.toFixed(1) }, gapPx: +gap(r, q).toFixed(2) };
    }).sort((a, b) => a.gapPx - b.gapPx).slice(0, 6);
  }

  out.session = {
    path: location.pathname,
    hasLoginForm: !!document.querySelector('input[name="password"], input[type="password"]'),
    bodyHead: (document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' '),
  };
  return out;
});

console.log(JSON.stringify({ ...result, consoleErrors: consoleErrors.slice(0, 6) }, null, 2));

const btn = page.locator('button[aria-label="Temporary chat"]').first();
if (await btn.count()) {
  await btn.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tmpchat-btn.png' }).catch(() => {});
}
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tmpchat-360.png' });
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tmpchat-360-top.png', clip: { x: 0, y: 0, width: 360, height: 140 } });

await browser.close();
