import { chromium } from 'playwright';
import fs from 'node:fs';

const SP = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const URL = 'http://localhost:5220/c/new';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function settle(minMs = 8000, maxMs = 30000) {
  const t0 = Date.now(); let prev = -1, stable = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => document.querySelectorAll('button, a, [role="tab"], [role="button"], input, textarea, select, summary').length);
    if (n === prev && n > 0) stable++; else stable = 0;
    prev = n;
    if (stable >= 3 && Date.now() - t0 >= minMs) break;
  }
  return prev;
}

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await settle();

const out = {};

// --- locate the mode strip: anything whose text is exactly one of the modes
out.modeCandidates = await page.evaluate(() => {
  const names = ['Chat', 'Search', 'News', 'Research', 'Deep Research', 'Agents', 'Images'];
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    const t = (el.textContent || '').trim();
    if (!names.includes(t)) continue;
    if (el.children.length > 0) continue; // leaf only
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // climb to nearest clickable
    let c = el, path = [];
    for (let i = 0; i < 5 && c; i++) {
      path.push(`${c.tagName.toLowerCase()}${c.getAttribute('role') ? '[' + c.getAttribute('role') + ']' : ''}.${(typeof c.className === 'string' ? c.className : '').split(' ').filter(Boolean).slice(0, 3).join('.')}`);
      c = c.parentElement;
    }
    res.push({ text: t, tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 90),
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      ancestry: path });
  }
  return res;
});

// --- composer stability: click each mode leaf's clickable ancestor
const fieldBox = async () => page.evaluate(() => {
  const el = document.querySelector('.field'); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { y: +r.y.toFixed(2), x: +r.x.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), bottom: +r.bottom.toFixed(2) };
});

const modes = [...new Set(out.modeCandidates.map((m) => m.text))];
out.modesFound = modes;
const stability = [{ mode: '(initial)', ...(await fieldBox()) }];
for (const m of modes) {
  const loc = page.getByText(m, { exact: true }).first();
  try {
    await loc.click({ timeout: 6000 });
    await page.waitForTimeout(1500);
    const fb = await fieldBox();
    stability.push({ mode: m, ...fb });
    await page.screenshot({ path: `${SP}/tab-${m.replace(/\s/g, '')}.png`, clip: { x: 540, y: 720, width: 1040, height: 360 } });
  } catch (e) {
    stability.push({ mode: m, clickError: String(e).split('\n')[0].slice(0, 120) });
  }
}
out.stability = stability;
const ys = stability.filter((s) => typeof s.y === 'number').map((s) => s.y);
out.fieldYs = ys;
out.fieldYSpread = ys.length > 1 ? +(Math.max(...ys) - Math.min(...ys)).toFixed(2) : 0;
const hs = stability.filter((s) => typeof s.h === 'number').map((s) => s.h);
out.fieldHeights = hs;

// after clicking modes, re-check overflow + field containment
out.afterModes = await page.evaluate(() => {
  const de = document.documentElement;
  const f = document.querySelector('.field');
  const r = f && f.getBoundingClientRect();
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
    field: r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) } : null };
});

out.pageErrors = pageErrors;
fs.writeFileSync(SP + '/tabs.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
