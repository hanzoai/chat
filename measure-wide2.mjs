import { chromium } from 'playwright';

const W = 2560, H = 1440;
const URL = 'http://localhost:5220/c/new';
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const out = { viewport: `${W}x${H}`, pageerrors: [], consoleErrors: [], steps: {} };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();

page.on('pageerror', e => out.pageerrors.push({ msg: String(e && e.message || e), stack: String(e && e.stack || '').split('\n').slice(0, 4).join(' | ') }));
page.on('console', m => { if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 240)); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await sleep(9000);
try { await page.waitForSelector('.field', { state: 'visible', timeout: 15000 }); } catch { out.steps.fieldNeverAppeared = true; }
await sleep(3000);

const LIB = `
window.__vis = (el) => {
  if (el.closest('.ReactQueryDevtools') || el.closest('[aria-label="React Query Devtools"]')) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0.5 || r.height <= 0.5) return false;
  return true;
};
window.__desc = (el) => {
  let s = el.tagName.toLowerCase();
  if (el.id) s += '#' + el.id;
  const dt = el.getAttribute('data-testid'); if (dt) s += '[data-testid="' + dt + '"]';
  const al = el.getAttribute('aria-label'); if (al) s += '[aria-label="' + al + '"]';
  if (!dt && !al && !el.id) {
    const cls = (el.getAttribute('class')||'').trim().split(/\\s+/).filter(Boolean).slice(0,3).join('.');
    if (cls) s += '.' + cls;
  }
  const txt = (el.innerText||el.value||'').trim().replace(/\\s+/g,' ').slice(0,32);
  if (txt) s += ' {' + txt + '}';
  return s;
};
window.__rr = (r) => ({x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1)});
window.__field = () => { const f=[...document.querySelectorAll('.field')].filter(window.__vis)[0]; return f? window.__rr(f.getBoundingClientRect()) : null; };
window.__nav = () => {
  const n = document.querySelector('[data-testid="nav"]') || document.querySelector('nav#chat-history-nav');
  if (!n) return null;
  const cs = getComputedStyle(n);
  return { sel: window.__desc(n), box: window.__rr(n.getBoundingClientRect()), display: cs.display, visibility: cs.visibility, transform: cs.transform, width: cs.width, offsetWidth: n.offsetWidth, cls: n.getAttribute('class') };
};
window.__ctrls = () => [...document.querySelectorAll('button, a, [role="tab"], [role="button"], [role="menuitem"], input, select, textarea')]
  .filter(window.__vis)
  .map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { sel: window.__desc(el), box: window.__rr(r), fs: parseFloat(cs.fontSize), pe: cs.pointerEvents, tag: el.tagName.toLowerCase(), disabled: !!el.disabled }; });
`;
await page.addInitScript(LIB); // for later navigations
await page.evaluate(LIB);

const SNAP = `(() => {
  const vw = innerWidth, vh = innerHeight, de = document.documentElement;
  const res = { vw, vh, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, scrollHeight: de.scrollHeight, clientHeight: de.clientHeight,
                bodyScrollWidth: document.body.scrollWidth, bodyClientWidth: document.body.clientWidth };
  res.overflow = [];
  for (const el of document.querySelectorAll('*')) { if (!window.__vis(el)) continue; const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) res.overflow.push({ sel: window.__desc(el), box: window.__rr(r) }); }
  res.overflow = res.overflow.slice(0,30);

  res.scrollx = [];
  for (const el of document.querySelectorAll('*')) { if (!window.__vis(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) res.scrollx.push({ sel: window.__desc(el), sw: el.scrollWidth, cw: el.clientWidth, ox: getComputedStyle(el).overflowX, box: window.__rr(el.getBoundingClientRect()) }); }
  res.scrollx = res.scrollx.slice(0,20);

  res.field = window.__field();
  const f = [...document.querySelectorAll('.field')].filter(window.__vis)[0];
  if (f) { const cs = getComputedStyle(f); res.fieldStyle = { maxWidth: cs.maxWidth, width: cs.width, position: cs.position, bg: cs.backgroundColor, color: cs.color, border: cs.border, overflow: cs.overflow };
    const p = f.parentElement; res.fieldParent = p ? { sel: window.__desc(p), box: window.__rr(p.getBoundingClientRect()), maxWidth: getComputedStyle(p).maxWidth } : null;
    // ancestor chain widths
    res.chain = []; let a = f; for (let i=0;i<6 && a;i++){ const cs2=getComputedStyle(a); res.chain.push({ sel: window.__desc(a).slice(0,80), box: window.__rr(a.getBoundingClientRect()), maxWidth: cs2.maxWidth, padL: cs2.paddingLeft, padR: cs2.paddingRight, mL: cs2.marginLeft, mR: cs2.marginRight }); a = a.parentElement; }
  }
  res.form = (()=>{ const x=[...document.querySelectorAll('form')].filter(window.__vis)[0]; return x? {sel: window.__desc(x), box: window.__rr(x.getBoundingClientRect()), maxWidth: getComputedStyle(x).maxWidth} : null; })();
  res.textareas = [...document.querySelectorAll('textarea')].filter(window.__vis).map(t=>({sel:window.__desc(t), box: window.__rr(t.getBoundingClientRect()), fs: getComputedStyle(t).fontSize}));
  res.nav = window.__nav();
  res.controls = window.__ctrls();

  res.tiny = [];
  for (const el of document.querySelectorAll('*')) { if (!window.__vis(el)) continue;
    if (![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) res.tiny.push({ sel: window.__desc(el), fs, box: window.__rr(el.getBoundingClientRect()) }); }
  res.tiny = res.tiny.slice(0,30);

  res.trunc = [];
  for (const el of document.querySelectorAll('*')) { if (!window.__vis(el)) continue;
    if (![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) { const cs=getComputedStyle(el);
      res.trunc.push({ sel: window.__desc(el), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, to: cs.textOverflow, ov: cs.overflow, ws: cs.whiteSpace }); } }
  res.trunc = res.trunc.slice(0,25);

  res.footers = [...document.querySelectorAll('footer, [class*="footer" i], [class*="Footer"]')].filter(window.__vis).map(el=>({sel:window.__desc(el), box: window.__rr(el.getBoundingClientRect())}));
  return res;
})()`;

out.steps.snap = await page.evaluate(SNAP);
await page.screenshot({ path: SHOT + '/w-01-base.png' });

// ---------- overlap of interactive controls ----------
out.steps.overlaps = await page.evaluate(`(() => {
  const c = window.__ctrls();
  const pairs = [];
  for (let i=0;i<c.length;i++) for (let j=i+1;j<c.length;j++) {
    const a=c[i].box, b=c[j].box;
    const ox = Math.min(a.right,b.right)-Math.max(a.x,b.x);
    const oy = Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
    if (ox > 1 && oy > 1) {
      // skip nesting (one fully contains other) -> still report but flag
      const aInB = a.x>=b.x-0.5 && a.right<=b.right+0.5 && a.y>=b.y-0.5 && a.bottom<=b.bottom+0.5;
      const bInA = b.x>=a.x-0.5 && b.right<=a.right+0.5 && b.y>=a.y-0.5 && b.bottom<=a.bottom+0.5;
      pairs.push({ a: c[i].sel, b: c[j].sel, aBox:a, bBox:b, ox:+ox.toFixed(1), oy:+oy.toFixed(1), nested: aInB||bInA });
    }
  }
  return pairs.slice(0,40);
})()`);

// ---------- offscreen + tap targets ----------
out.steps.audit = await page.evaluate(`(() => {
  const c = window.__ctrls();
  const off = c.filter(x => x.box.x < -0.5 || x.box.y < -0.5 || x.box.right > innerWidth + 0.5 || x.box.bottom > innerHeight + 0.5);
  const small = c.filter(x => x.box.w < 44 || x.box.h < 44).map(x => ({ sel: x.sel, w: x.box.w, h: x.box.h }));
  return { total: c.length, off, small };
})()`);

// ---------- enumerate ALL composer-row tabs ----------
out.steps.tabRow = await page.evaluate(`(() => {
  const f = [...document.querySelectorAll('.field')].filter(window.__vis)[0];
  if (!f) return null;
  const fb = f.getBoundingClientRect();
  const c = window.__ctrls().filter(x => Math.abs(x.box.bottom - fb.y) < 90 || (x.box.y > fb.y - 120 && x.box.bottom < fb.y + 2));
  return c;
})()`);

// ---------- 3. composer stability across mode tabs (2 rounds) ----------
const clickTab = async (name) => {
  const sels = [
    `button:text-is("${name}")`,
    `[role="tab"]:text-is("${name}")`,
    `button:has-text("${name}")`,
  ];
  for (const s of sels) {
    const loc = page.locator(s).first();
    if (await loc.count()) {
      try { await loc.click({ timeout: 4000 }); return true; } catch { /* try next */ }
    }
  }
  return false;
};

out.steps.stability = [];
for (const round of [1, 2]) {
  for (const name of ['Chat', 'Search', 'News', 'Research']) {
    const ok = await clickTab(name);
    if (!ok) { out.steps.stability.push({ round, name, found: false }); continue; }
    await sleep(1500);
    const field = await page.evaluate('window.__field()');
    const nav = await page.evaluate('window.__nav()');
    out.steps.stability.push({ round, name, found: true, field, navW: nav && nav.box.w });
  }
}
await page.screenshot({ path: SHOT + '/w-02-tabs.png' });

// back to Chat baseline
await clickTab('Chat');
await sleep(1200);

// ---------- 4. SIDEBAR toggle ----------
out.steps.sidebar = {};
out.steps.sidebar.expanded = await page.evaluate('window.__nav()');
const closeBtn = page.locator('[data-testid="close-sidebar-button"], #close-sidebar-button, button[aria-label="Close sidebar"]').first();
out.steps.sidebar.closeBtnCount = await closeBtn.count();
if (await closeBtn.count()) {
  await closeBtn.click({ timeout: 5000 });
  await sleep(1800);
  out.steps.sidebar.collapsed = await page.evaluate('window.__nav()');
  out.steps.sidebar.collapsedField = await page.evaluate('window.__field()');
  // what visible controls remain in the left 120px?
  out.steps.sidebar.leftControls = await page.evaluate(`(() => window.__ctrls().filter(c => c.box.x < 120))()`);
  out.steps.sidebar.collapsedSnapOverflow = await page.evaluate(`(() => { const r=[]; for (const el of document.querySelectorAll('*')) { if(!window.__vis(el)) continue; const b=el.getBoundingClientRect(); if (b.right>innerWidth+1||b.left<-1) r.push({sel:window.__desc(el), box: window.__rr(b)}); } return r.slice(0,20); })()`);
  await page.screenshot({ path: SHOT + '/w-03-collapsed.png' });

  // reopen
  const openBtn = page.locator('[data-testid="open-sidebar-button"], #open-sidebar-button, button[aria-label="Open sidebar"], button[aria-label*="idebar"]').first();
  out.steps.sidebar.openBtnCount = await openBtn.count();
  out.steps.sidebar.openBtnBox = await openBtn.count() ? await openBtn.boundingBox() : null;
  if (await openBtn.count()) { await openBtn.click({ timeout: 5000 }); await sleep(1800); out.steps.sidebar.reexpanded = await page.evaluate('window.__nav()'); }
  await page.screenshot({ path: SHOT + '/w-04-reopened.png' });
}

// final snapshot
out.steps.finalSnap = await page.evaluate(SNAP);

console.log(JSON.stringify(out, null, 1));
await browser.close();
