import { chromium } from 'playwright';

const URL = 'http://localhost:5220/c/new';
const W = 1440, H = 900;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e)));
page.on('console', m => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(8000);

const out = {};

// ---------- 1. horizontal overflow ----------
out.overflow = await page.evaluate((W) => {
  const de = document.documentElement;
  const res = {
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
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
    if (r.right > W + 0.5 || r.left < -0.5) {
      // determine if scroll container ancestor clips it
      res.offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 90),
        id: el.id || '',
        aria: el.getAttribute('aria-label') || '',
        x: +r.x.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), y: +r.y.toFixed(1),
        pos: cs.position, ovx: cs.overflowX
      });
    }
  }
  res.offenders = res.offenders.slice(0, 60);
  return res;
}, W);

// ---------- helper: describe a selector box ----------
const boxOf = (sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
           right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), display: cs.display, pos: cs.position, z: cs.zIndex };
}, sel);

// ---------- 2. composer ----------
out.composer = await boxOf('.field');
out.composerCount = await page.evaluate(() => document.querySelectorAll('.field').length);
out.composerAll = await page.evaluate(() => [...document.querySelectorAll('.field')].map(el => {
  const r = el.getBoundingClientRect();
  return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), cls: String(el.className).slice(0,120) };
}));

// what covers the composer center-bottom?
if (out.composer) {
  out.composerCoveredBy = await page.evaluate((b) => {
    const pts = [[b.x + b.w/2, b.bottom - 4], [b.x + 8, b.y + 4], [b.right - 8, b.bottom - 4]];
    return pts.map(([px,py]) => {
      const el = document.elementFromPoint(px, py);
      if (!el) return { pt:[px,py], hit: null };
      return { pt:[+px.toFixed(0),+py.toFixed(0)], hit: el.tagName.toLowerCase() + '.' + String(el.className).slice(0,60) };
    });
  }, out.composer);
}

// ---------- 3. composer stability across mode tabs ----------
const tabInfo = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('[role="tab"], button, a')];
  const names = ['chat', 'search', 'news', 'research'];
  const found = [];
  for (const el of cands) {
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase();
    if (names.includes(t)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) found.push({ text: t, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), role: el.getAttribute('role') || el.tagName.toLowerCase() });
    }
  }
  return found;
});
out.tabsFound = tabInfo;

const stability = [];
for (const t of tabInfo) {
  try {
    const loc = page.locator(`[role="tab"], button, a`).filter({ hasText: new RegExp(`^\\s*${t.text}\\s*$`, 'i') }).first();
    await loc.click({ timeout: 4000 });
    await sleep(1200);
    const b = await boxOf('.field');
    stability.push({ tab: t.text, field: b });
  } catch (e) {
    stability.push({ tab: t.text, err: String(e).slice(0, 120) });
  }
}
out.stability = stability;

await sleep(500);
out.composerAfterTabs = await boxOf('.field');

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/shot-1440-after-tabs.png' });

console.log(JSON.stringify(out, null, 2));
await browser.close();
