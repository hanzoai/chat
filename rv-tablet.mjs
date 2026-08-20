import { chromium } from 'playwright';

const W = 768, H = 1024;
const URL = 'http://localhost:5220/c/new';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.stack ? e.stack.split('\n').slice(0,3).join(' | ') : e)));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(8000);

const out = {};

// ---------- 1. horizontal overflow ----------
out.overflow = await page.evaluate((VW) => {
  const de = document.documentElement;
  const res = {
    scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    offenders: []
  };
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > VW + 0.5 || r.left < -0.5) {
      // is it actually contributing to scroll? check ancestors don't clip
      let clipped = false;
      let p = el.parentElement;
      while (p) {
        const pcs = getComputedStyle(p);
        if (pcs.overflowX === 'hidden' || pcs.overflowX === 'auto' || pcs.overflowX === 'scroll' || pcs.overflow === 'hidden') { clipped = true; break; }
        p = p.parentElement;
      }
      res.offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 120),
        aria: el.getAttribute('aria-label') || '',
        id: el.id || '',
        left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), width: +r.width.toFixed(1),
        clippedByAncestor: clipped
      });
    }
  }
  res.offenders.sort((a,b) => b.right - a.right);
  res.offenders = res.offenders.slice(0, 40);
  return res;
}, W);

// ---------- helper: collect visible interactive controls ----------
const collectControls = async () => page.evaluate(() => {
  const sel = 'button, a, [role="tab"], [role="button"], input, textarea, select, [tabindex]:not([tabindex="-1"])';
  const els = [...document.querySelectorAll(sel)];
  const items = [];
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // skip elements fully hidden behind a clipping ancestor with 0 size
    let hidden = false;
    let p = el.parentElement;
    while (p) { const pcs = getComputedStyle(p); if (pcs.display === 'none' || pcs.visibility === 'hidden' || +pcs.opacity === 0) { hidden = true; break; } p = p.parentElement; }
    if (hidden) continue;
    items.push({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      aria: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g,' ').slice(0, 60),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 90),
      id: el.id || '',
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
      fontSize: cs.fontSize,
      pos: cs.position,
      z: cs.zIndex,
    });
  }
  return items;
});

out.controls = await collectControls();

// ---------- 2. composer .field ----------
out.field = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.field')];
  return els.map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), cls: (typeof el.className==='string'?el.className:'').slice(0,140), bg: cs.backgroundColor, color: cs.color, pos: cs.position };
  });
});

// what is on top of the field center-bottom?
out.fieldTopmost = await page.evaluate(() => {
  const el = document.querySelector('.field');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const probes = [[r.x + r.width/2, r.y + 4], [r.x + r.width/2, r.bottom - 4], [r.x + 4, r.y + r.height/2]];
  return probes.map(([x,y]) => {
    const t = document.elementFromPoint(x, y);
    return { x: +x.toFixed(0), y: +y.toFixed(0), tag: t ? t.tagName.toLowerCase() : null, cls: t && typeof t.className === 'string' ? t.className.slice(0,90) : '' };
  });
});

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tp-01-initial.png', fullPage: false });

// ---------- 3. composer stability across mode tabs ----------
const tabInfo = await page.evaluate(() => {
  const names = ['chat','search','news','research','agents','code'];
  const sel = 'button, [role="tab"], a';
  const found = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const txt = (el.textContent || '').trim().toLowerCase();
    const al = (el.getAttribute('aria-label') || '').toLowerCase();
    if (names.includes(txt) || names.includes(al)) {
      found.push({ label: txt || al, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    }
  }
  return found;
});
out.tabsFound = tabInfo;

out.stability = [];
const getFieldY = () => page.evaluate(() => {
  const el = document.querySelector('.field');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { y: +r.y.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1), x: +r.x.toFixed(1), w: +r.width.toFixed(1) };
});

out.stability.push({ label: 'initial', ...(await getFieldY()) });
for (const t of tabInfo) {
  try {
    const loc = page.locator(`text="${t.label}"`).first();
    // click by coordinates to avoid strict-mode issues
    await page.mouse.click(t.x + t.w/2, t.y + t.h/2);
    await sleep(1200);
    const f = await getFieldY();
    out.stability.push({ label: t.label, ...f });
  } catch (e) {
    out.stability.push({ label: t.label, err: String(e).slice(0,120) });
  }
}
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tp-02-after-tabs.png' });

// ---------- 4. sidebar ----------
out.sidebar = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('nav, aside, [data-testid*="nav"], [id*="sidebar"], [class*="sidebar"], [class*="Sidebar"]')];
  return cands.map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), id: el.id||'', cls: (typeof el.className==='string'?el.className:'').slice(0,140), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), display: cs.display, visibility: cs.visibility, opacity: cs.opacity, transform: cs.transform, position: cs.position };
  }).filter(o => o.w > 0 || o.h > 0 || o.display !== 'none');
});

// toggle controls candidates
out.toggleCandidates = out.controls.filter(c => /nav|sidebar|menu|toggle|open|close/i.test(c.aria + ' ' + c.cls + ' ' + c.id));

console.log(JSON.stringify({ pageErrors, consoleErrors: consoleErrors.slice(0,25), out }, null, 1));

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/tp-03-final.png' });
await browser.close();
