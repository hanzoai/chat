import { chromium } from 'playwright';
import fs from 'node:fs';

const SP = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const URL = 'http://localhost:5220/c/new';
const SEL = 'button, a, [role="tab"], [role="button"], input, textarea, select, summary';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e).slice(0, 300)));

async function settle(minMs = 8000, maxMs = 30000) {
  const t0 = Date.now();
  let prev = -1, stable = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(
      () => document.querySelectorAll('button, a, [role="tab"], [role="button"], input, textarea, select, summary').length
    );
    if (n === prev && n > 0) stable++; else stable = 0;
    prev = n;
    if (stable >= 3 && Date.now() - t0 >= minMs) break;
  }
  return prev;
}

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
const settledCount = await settle();

const out = { settledCount, pageErrors };

// ---------- shared browser-side helpers injected per evaluate ----------
const SNAP = `
  const SEL='button, a, [role="tab"], [role="button"], input, textarea, select, summary';
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
    let p = el.parentElement;
    while (p) { const pc = getComputedStyle(p);
      if (pc.display==='none' || pc.visibility==='hidden' || parseFloat(pc.opacity)===0) return false;
      p = p.parentElement; }
    return true;
  };
  const desc = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), aria: el.getAttribute('aria-label')||'', role: el.getAttribute('role')||'',
      id: el.id||'', cls: (typeof el.className==='string'?el.className:'').slice(0,80),
      text: (el.innerText||'').trim().slice(0,40).replace(/\\n/g,'|'),
      x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), fs: parseFloat(cs.fontSize) }; };
`;

const controls = await page.evaluate(new Function(`${SNAP}
  return [...document.querySelectorAll(SEL)].filter(visible).map(desc);
`));
out.visibleControls = controls.length;
out.controlDump = controls;

// ---- 1. horizontal overflow
out.overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth: window.innerWidth,
           bodyScrollWidth: document.body.scrollWidth, overflowsBy: de.scrollWidth - de.clientWidth };
});
out.rightEdgeOffenders = await page.evaluate(new Function(`${SNAP}
  const vw = document.documentElement.clientWidth;
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) res.push({ ...desc(el), scrollW: el.scrollWidth, clientW: el.clientWidth });
  }
  return res.slice(0, 40);
`));

// ---- 2. composer .field geometry + what sits below it
out.field = await page.evaluate(() => {
  const el = document.querySelector('.field');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
    right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), vw, vh,
    insideX: r.x >= -0.5 && r.right <= vw + 0.5, insideY: r.y >= -0.5 && r.bottom <= vh + 0.5,
    overflow: cs.overflow, bg: cs.backgroundColor, z: cs.zIndex, pos: cs.position };
});
// does anything overlap the field visually (footer etc.)
out.fieldOverlappers = await page.evaluate(new Function(`${SNAP}
  const f = document.querySelector('.field'); if (!f) return [];
  const rf = f.getBoundingClientRect(); const res = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue;
    if (f.contains(el) || el.contains(f)) continue;
    const r = el.getBoundingClientRect();
    const ox = Math.min(rf.right,r.right)-Math.max(rf.left,r.left);
    const oy = Math.min(rf.bottom,r.bottom)-Math.max(rf.top,r.top);
    if (ox>1 && oy>1) res.push({ ...desc(el), overlapW:+ox.toFixed(1), overlapH:+oy.toFixed(1) });
  }
  return res;
`));

// ---- 3. composer stability across mode tabs
const tabNames = ['Chat', 'Search', 'News', 'Research', 'Deep Research'];
const stability = [];
const fieldY = async () => page.evaluate(() => {
  const el = document.querySelector('.field'); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { y:+r.y.toFixed(2), x:+r.x.toFixed(2), h:+r.height.toFixed(2), w:+r.width.toFixed(2), bottom:+r.bottom.toFixed(2) };
});
stability.push({ mode: '(initial)', ...(await fieldY()) });
for (const name of tabNames) {
  const loc = page.locator(`button:text-is("${name}"), [role="tab"]:text-is("${name}")`).first();
  const n = await loc.count().catch(() => 0);
  if (!n) { stability.push({ mode: name, present: false }); continue; }
  try {
    await loc.click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    stability.push({ mode: name, present: true, ...(await fieldY()) });
    await page.screenshot({ path: `${SP}/mode-${name.replace(/\s/g,'')}.png`, clip: { x: 560, y: 740, width: 1000, height: 340 } });
  } catch (e) {
    stability.push({ mode: name, present: true, clickError: String(e).slice(0, 140) });
  }
}
out.stability = stability;
const ys = stability.filter((s) => typeof s.y === 'number').map((s) => s.y);
out.fieldYSpread = ys.length ? +(Math.max(...ys) - Math.min(...ys)).toFixed(2) : null;
out.fieldYs = ys;

// reload to a clean state for the rest
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await settle();

// ---- 4. sidebar rail at 1920 (>= md)
out.sidebar = await (async () => {
  const measure = () => page.evaluate(() => {
    const cand = [];
    // nav elements and known sidebar containers
    for (const el of document.querySelectorAll('nav, aside, div[class*="sidebar"], div[class*="Sidebar"], #nav, [data-testid*="nav"]')) {
      const r = el.getBoundingClientRect();
      if (r.height < 100) continue;
      cand.push({ tag: el.tagName.toLowerCase(), id: el.id || '',
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 90),
        x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1) });
    }
    const main = document.querySelector('main');
    const mr = main && main.getBoundingClientRect();
    return { cand, main: mr ? { x:+mr.x.toFixed(1), w:+mr.width.toFixed(1) } : null };
  });
  const open = await measure();
  // find the toggle
  const toggleInfo = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      const a = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.dataset.testid || '');
      if (/sidebar|nav|panel|collapse|close|menu|toggle/i.test(a)) {
        const r = el.getBoundingClientRect();
        out.push({ aria: el.getAttribute('aria-label') || '', title: el.getAttribute('title') || '',
          testid: el.dataset.testid || '', x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) });
      }
    }
    return out;
  });
  let clicked = null, closed = null;
  const tog = page.locator('[data-testid="close-sidebar-button"], button[aria-label*="idebar" i], button[title*="idebar" i]').first();
  if (await tog.count().catch(() => 0)) {
    clicked = await tog.evaluate((el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.dataset.testid || '')).catch(() => 'unknown');
    await tog.click({ timeout: 5000 }).catch((e) => { clicked = 'ERR ' + String(e).slice(0, 80); });
    await page.waitForTimeout(1500);
    closed = await measure();
  }
  return { openState: open, toggleCandidates: toggleInfo, clickedToggle: clicked, closedState: closed };
})();
await page.screenshot({ path: SP + '/sidebar-collapsed.png' });

// reload again clean for overlap / tap / font checks
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await settle();

// ---- 5. overlaps
out.overlaps = await page.evaluate(new Function(`${SNAP}
  const els = [...document.querySelectorAll(SEL)].filter(visible);
  const res = [];
  for (let i=0;i<els.length;i++) for (let j=i+1;j<els.length;j++) {
    const a=els[i], b=els[j];
    if (a.contains(b)||b.contains(a)) continue;
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    const ox=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);
    const oy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
    if (ox>1&&oy>1) res.push({ a: desc(a), b: desc(b), overlapW:+ox.toFixed(1), overlapH:+oy.toFixed(1) });
  }
  return res.slice(0,40);
`));

// ---- 6. off-screen controls
out.offscreen = await page.evaluate(new Function(`${SNAP}
  const vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
  return [...document.querySelectorAll(SEL)].filter(visible).map(desc)
    .filter(c => c.x < -0.5 || c.y < -0.5 || c.right > vw+0.5 || c.bottom > vh+0.5);
`));

// ---- 7. tap targets
out.smallTargets = await page.evaluate(new Function(`${SNAP}
  return [...document.querySelectorAll(SEL)].filter(visible).map(desc)
    .filter(c => c.w < 44 || c.h < 44)
    .sort((a,b) => (a.w*a.h)-(b.w*b.h));
`));

// ---- 8. fonts + truncation
out.tinyFonts = await page.evaluate(new Function(`${SNAP}
  const res=[]; const seen=new Set();
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    let hasText=false; for (const n of el.childNodes) if (n.nodeType===3 && n.textContent.trim()) hasText=true;
    if (!hasText) continue;
    const f = parseFloat(getComputedStyle(el).fontSize);
    if (f < 11) { const k = el.tagName+f+el.textContent.trim().slice(0,15); if (seen.has(k)) continue; seen.add(k);
      res.push({ ...desc(el), fontSize: f, full: el.textContent.trim().slice(0,60) }); }
  }
  return res.slice(0,30);
`));
out.truncated = await page.evaluate(new Function(`${SNAP}
  const res=[];
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    let hasText=false; for (const n of el.childNodes) if (n.nodeType===3 && n.textContent.trim()) hasText=true;
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const clipped = cs.overflowX==='hidden'||cs.overflow==='hidden'||cs.textOverflow==='ellipsis';
    if (clipped && el.scrollWidth > el.clientWidth + 1)
      res.push({ ...desc(el), scrollW: el.scrollWidth, clientW: el.clientWidth, full: el.textContent.trim().slice(0,60) });
  }
  return res.slice(0,25);
`));

out.pageErrors = pageErrors;
fs.writeFileSync(SP + '/main.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, controlDump: '(see main.json)' }, null, 2));
await browser.close();
