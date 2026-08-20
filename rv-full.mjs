import { chromium } from 'playwright';
import fs from 'fs';

const W = 1920, H = 1080;
const URL = 'http://localhost:5220/c/new';
const SP = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

const out = { pageErrors };

const CTRL = 'button, a, [role="tab"], [role="button"], input, textarea, select, summary';

const collect = async () =>
  page.evaluate((CTRL) => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      if (parseFloat(cs.opacity) === 0) return false;
      // walk ancestors for hidden
      let p = el.parentElement;
      while (p) {
        const pc = getComputedStyle(p);
        if (pc.display === 'none' || pc.visibility === 'hidden' || parseFloat(pc.opacity) === 0) return false;
        p = p.parentElement;
      }
      return true;
    };
    const desc = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        aria: el.getAttribute('aria-label') || '',
        role: el.getAttribute('role') || '',
        id: el.id || '',
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 90),
        text: (el.innerText || el.value || '').trim().slice(0, 40).replace(/\n/g, '|'),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
        fs: parseFloat(cs.fontSize),
        pe: cs.pointerEvents,
        disabled: !!el.disabled,
      };
    };
    const ctrls = [...document.querySelectorAll(CTRL)].filter(vis).map(desc);
    return { vw, vh, ctrls };
  }, CTRL);

// ---- baseline controls
const base = await collect();
out.viewportInner = { vw: base.vw, vh: base.vh };
out.controlCount = base.ctrls.length;

// 6. off-screen controls
out.offscreen = base.ctrls.filter(
  (c) => c.x < -0.5 || c.y < -0.5 || c.right > base.vw + 0.5 || c.bottom > base.vh + 0.5
);

// 7. tap targets < 44
out.smallTargets = base.ctrls
  .filter((c) => c.w < 44 || c.h < 44)
  .map((c) => ({ ...c, size: `${c.w}x${c.h}` }));

// 5. overlaps among visible interactive controls (exclude ancestor/descendant pairs)
out.overlaps = await page.evaluate((CTRL) => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
    let p = el.parentElement;
    while (p) {
      const pc = getComputedStyle(p);
      if (pc.display === 'none' || pc.visibility === 'hidden' || parseFloat(pc.opacity) === 0) return false;
      p = p.parentElement;
    }
    return true;
  };
  const els = [...document.querySelectorAll(CTRL)].filter(vis);
  const lab = (el) => {
    const r = el.getBoundingClientRect();
    return `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? '[' + el.getAttribute('aria-label') + ']' : ''}${
      (el.innerText || '').trim() ? '"' + (el.innerText || '').trim().slice(0, 24).replace(/\n/g, '|') + '"' : ''
    }@(${r.x.toFixed(0)},${r.y.toFixed(0)},${r.width.toFixed(0)}x${r.height.toFixed(0)})`;
  };
  const res = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 1 && oy > 1) {
        res.push({ a: lab(a), b: lab(b), overlapW: +ox.toFixed(1), overlapH: +oy.toFixed(1) });
      }
    }
  }
  return res.slice(0, 40);
}, CTRL);

// 8. tiny fonts on visible text nodes
out.tinyFonts = await page.evaluate(() => {
  const res = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    // only elements with own direct text
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText) continue;
    const fs = parseFloat(cs.fontSize);
    if (fs < 11) {
      const key = el.tagName + fs + el.textContent.trim().slice(0, 20);
      if (seen.has(key)) continue;
      seen.add(key);
      res.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        fontSize: fs,
        text: el.textContent.trim().slice(0, 50),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      });
    }
  }
  return res.slice(0, 30);
});

// 8b. truncated text (scrollWidth > clientWidth on text-bearing elements)
out.truncated = await page.evaluate(() => {
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText) continue;
    if (el.scrollWidth > el.clientWidth + 1 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden')) {
      res.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        text: el.textContent.trim().slice(0, 60),
        scrollW: el.scrollWidth, clientW: el.clientWidth,
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1),
      });
    }
  }
  return res.slice(0, 25);
});

fs.writeFileSync(SP + '/full.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

// composer close-up
await page.screenshot({ path: SP + '/composer-closeup.png', clip: { x: 600, y: 790, width: 920, height: 290 } });
await page.screenshot({ path: SP + '/topright.png', clip: { x: 1600, y: 0, width: 320, height: 220 } });

await browser.close();
