import { chromium } from 'playwright';

const W = 2560, H = 1440;
const URL = 'http://localhost:5220/c/new';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const out = { viewport: `${W}x${H}`, errors: [], steps: {} };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();

page.on('pageerror', e => out.errors.push({ type: 'pageerror', msg: String(e && e.message || e), stack: String(e && e.stack || '').split('\n').slice(0,3).join(' | ') }));
page.on('console', m => {
  if (m.type() === 'error') {
    const t = m.text();
    out.errors.push({ type: 'console.error', msg: t.slice(0, 300) });
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await sleep(9000);

// ---------- helpers injected ----------
const COLLECT = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const de = document.documentElement;
  const res = {
    vw, vh,
    scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
    bodyScrollWidth: document.body.scrollWidth, bodyClientWidth: document.body.clientWidth,
    scrollHeight: de.scrollHeight, clientHeight: de.clientHeight,
  };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    return true;
  };
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = (el.getAttribute('class')||'').trim().split(/\\s+/).filter(Boolean).slice(0,4).join('.');
    if (cls) s += '.' + cls;
    const al = el.getAttribute('aria-label'); if (al) s += '[aria-label="' + al + '"]';
    const dt = el.getAttribute('data-testid'); if (dt) s += '[data-testid="' + dt + '"]';
    const txt = (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,40);
    if (txt) s += ' {' + txt + '}';
    return s;
  };
  const rr = (r) => ({x: +r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1)});

  // 1. overflow offenders
  res.overflow = [];
  for (const el of document.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      res.overflow.push({ sel: desc(el), box: rr(r) });
    }
  }
  res.overflow = res.overflow.slice(0, 40);

  // scrollable-x containers
  res.scrollx = [];
  for (const el of document.querySelectorAll('*')) {
    if (!vis(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      res.scrollx.push({ sel: desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, box: rr(el.getBoundingClientRect()), overflowX: getComputedStyle(el).overflowX });
    }
  }
  res.scrollx = res.scrollx.slice(0, 20);

  // 2. composer .field
  const fields = [...document.querySelectorAll('.field')].filter(vis);
  res.fields = fields.map(f => {
    const cs = getComputedStyle(f);
    return { sel: desc(f), box: rr(f.getBoundingClientRect()), bg: cs.backgroundColor, color: cs.color, maxWidth: cs.maxWidth, position: cs.position, zIndex: cs.zIndex };
  });

  // form / composer wrapper
  const form = document.querySelector('form');
  res.form = form && vis(form) ? { sel: desc(form), box: rr(form.getBoundingClientRect()), maxWidth: getComputedStyle(form).maxWidth } : null;

  // textarea
  const tas = [...document.querySelectorAll('textarea')].filter(vis);
  res.textareas = tas.map(t => ({ sel: desc(t), box: rr(t.getBoundingClientRect()), fs: getComputedStyle(t).fontSize }));

  // 5/6/7. interactive controls
  const ctrls = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], input, select, textarea')].filter(vis);
  res.controls = ctrls.map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel: desc(el), box: rr(r), fs: parseFloat(cs.fontSize), tag: el.tagName.toLowerCase(), role: el.getAttribute('role')||'', pe: cs.pointerEvents };
  });

  // 8. font sizes on text-bearing leaves
  res.tinyText = [];
  for (const el of document.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs < 11) res.tinyText.push({ sel: desc(el), fs, box: rr(el.getBoundingClientRect()) });
  }
  res.tinyText = res.tinyText.slice(0, 30);

  // truncation: scrollWidth > clientWidth on text elems w/ ellipsis
  res.truncated = [];
  for (const el of document.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText) continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      const cs = getComputedStyle(el);
      res.truncated.push({ sel: desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, textOverflow: cs.textOverflow, overflow: cs.overflow, whiteSpace: cs.whiteSpace });
    }
  }
  res.truncated = res.truncated.slice(0, 25);

  // nav / sidebar candidates
  res.navs = [...document.querySelectorAll('nav, aside, [role="navigation"], #nav, .nav')].map(el => ({
    sel: desc(el), visible: vis(el), box: rr(el.getBoundingClientRect()),
    display: getComputedStyle(el).display, transform: getComputedStyle(el).transform, width: getComputedStyle(el).width
  }));

  // footer
  res.footers = [...document.querySelectorAll('footer, [class*="footer" i]')].filter(vis).map(el => ({ sel: desc(el), box: rr(el.getBoundingClientRect()) }));

  return res;
})()`;

const base = await page.evaluate(COLLECT);
out.steps.base = base;

// screenshot
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/wide-base.png', fullPage: false });

// ---------- 3. composer stability across mode tabs ----------
const tabInfo = await page.evaluate(`(() => {
  const vis = (el) => { const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
  const names = ['chat','search','news','research','agents','deep'];
  const cands = [...document.querySelectorAll('button, [role="tab"], a')].filter(vis).map(el => ({
    txt: (el.innerText||'').trim().replace(/\\s+/g,' '),
    al: el.getAttribute('aria-label')||'',
    role: el.getAttribute('role')||'',
    id: el.id||'',
    cls: el.getAttribute('class')||'',
    box: (r=>({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}))(el.getBoundingClientRect())
  }));
  return cands.filter(c => names.some(n => c.txt.toLowerCase() === n || c.al.toLowerCase() === n || c.txt.toLowerCase().startsWith(n)));
})()`);
out.steps.tabCandidates = tabInfo;

const fieldY = async () => page.evaluate(`(() => {
  const f = [...document.querySelectorAll('.field')].filter(e => { const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; })[0];
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};
})()`);

out.steps.stability = [];
const wanted = ['Chat', 'Search', 'News', 'Research'];
for (const name of wanted) {
  try {
    const loc = page.getByRole('button', { name, exact: true }).first();
    let count = await loc.count();
    let target = loc;
    if (!count) {
      const alt = page.locator(`[role="tab"]:has-text("${name}"), button:has-text("${name}")`).first();
      count = await alt.count();
      target = alt;
    }
    if (!count) { out.steps.stability.push({ name, found: false }); continue; }
    await target.click({ timeout: 4000 });
    await sleep(1400);
    const box = await fieldY();
    out.steps.stability.push({ name, found: true, field: box });
  } catch (e) {
    out.steps.stability.push({ name, found: false, err: String(e.message).slice(0, 150) });
  }
}
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/wide-aftertabs.png' });

console.log(JSON.stringify(out, null, 1));
await browser.close();
