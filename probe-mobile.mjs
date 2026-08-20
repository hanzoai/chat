import { chromium } from 'playwright';

const URL = 'http://localhost:5220/c/new';
const W = 390, H = 844;

const out = { viewport: `${W}x${H}`, pageerrors: [], steps: {} };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const page = await ctx.newPage();

page.on('pageerror', e => out.pageerrors.push(String(e && e.message ? e.message : e)));
page.on('console', m => { if (m.type() === 'error') out.pageerrors.push('CONSOLE_ERROR: ' + m.text().slice(0, 300)); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);

// ---------- shared collector ----------
const COLLECT = `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth, vh = window.innerHeight;
  const res = {
    scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    vw, vh,
    overflowers: [], controls: [], smallFont: [], truncated: []
  };
  const sel = (el) => {
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\\s+/).slice(0,3).join('.') : '';
    const aria = el.getAttribute && el.getAttribute('aria-label') ? '[aria-label="' + el.getAttribute('aria-label') + '"]' : '';
    const dt = el.getAttribute && el.getAttribute('data-testid') ? '[data-testid="' + el.getAttribute('data-testid') + '"]' : '';
    return (t + id + cls + aria + dt).slice(0, 160);
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // must actually be hit-testable-ish: skip fully clipped-out ancestors
    return true;
  };
  const rr = (r) => ({ x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) });

  // ---- overflow: elements whose right edge exceeds viewport
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.width <= vw * 3) {
      res.overflowers.push({ sel: sel(el), ...rr(r), overhang: +(r.right - vw).toFixed(1),
        ovX: getComputedStyle(el).overflowX });
    }
  }
  res.overflowers.sort((a,b)=>b.overhang-a.overhang);
  res.overflowers = res.overflowers.slice(0, 40);

  // ---- interactive controls
  const q = 'button, a[href], [role=tab], [role=button], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(q)) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // element must be at least partially within the viewport band we care about
    res.controls.push({
      sel: sel(el), ...rr(r),
      text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      fs: parseFloat(cs.fontSize), disabled: !!el.disabled, tag: el.tagName.toLowerCase(),
      pe: cs.pointerEvents
    });
  }

  // ---- font sizes across visible text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.childNodes.length) continue;
    let hasText = false;
    for (const c of n.childNodes) if (c.nodeType === 3 && c.textContent.trim()) hasText = true;
    if (!hasText) continue;
    if (!visible(n)) continue;
    const cs = getComputedStyle(n);
    const fs = parseFloat(cs.fontSize);
    if (fs < 11) res.smallFont.push({ sel: sel(n), fs, text: n.innerText.trim().slice(0,40) });
    // truncation
    if (n.scrollWidth > n.clientWidth + 1 && (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden')) {
      res.truncated.push({ sel: sel(n), scrollWidth: n.scrollWidth, clientWidth: n.clientWidth, text: n.innerText.trim().slice(0,40) });
    }
  }
  res.smallFont = res.smallFont.slice(0, 25);
  res.truncated = res.truncated.slice(0, 25);

  // ---- composer
  const f = document.querySelector('.field');
  if (f) {
    const r = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    res.field = { ...rr(r), bg: cs.backgroundColor, color: cs.color, ovX: cs.overflowX };
  } else res.field = null;

  // ---- form / composer container fallback
  const formEl = document.querySelector('form');
  if (formEl) res.form = rr(formEl.getBoundingClientRect());

  return res;
})()`;

out.steps.initial = await page.evaluate(COLLECT);

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/m-initial.png', fullPage: false });

// ---------- mode tabs ----------
const tabInfo = await page.evaluate(`(() => {
  const names = ['chat','search','news','research','agents','code'];
  const found = [];
  const q = 'button, [role=tab], a';
  for (const el of document.querySelectorAll(q)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase();
    if (names.includes(t)) found.push({ text: t, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) });
  }
  return found;
})()`);
out.steps.tabs = tabInfo;

const fieldY = [];
for (const t of tabInfo) {
  try {
    const loc = page.locator(`button:text-is("${t.text}"), [role=tab]:text-is("${t.text}")`).first();
    await loc.click({ timeout: 3000 });
    await page.waitForTimeout(1200);
    const m = await page.evaluate(`(() => { const f = document.querySelector('.field'); if(!f) return null; const r=f.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}; })()`);
    fieldY.push({ tab: t.text, field: m });
  } catch (e) {
    fieldY.push({ tab: t.text, error: String(e).slice(0, 120) });
  }
}
out.steps.fieldPerTab = fieldY;

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/m-aftertabs.png' });

// ---------- sidebar ----------
out.steps.navBefore = await page.evaluate(`(() => {
  const cands = [];
  for (const s of ['nav', '[data-testid=nav]', 'aside', '#nav', '.nav']) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      cands.push({ sel: s, cls: (el.className||'').toString().slice(0,120), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), display: cs.display, transform: cs.transform, vis: cs.visibility });
    }
  }
  return cands;
})()`);

// find toggle
out.steps.toggles = await page.evaluate(`(() => {
  const res = [];
  for (const el of document.querySelectorAll('button,[role=button]')) {
    const al = (el.getAttribute('aria-label')||'') + ' ' + (el.getAttribute('data-testid')||'') + ' ' + (el.id||'');
    if (/nav|sidebar|menu|toggle|open|close/i.test(al)) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      res.push({ label: al.trim().slice(0,80), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), display: cs.display });
    }
  }
  return res;
})()`);

await browser.close();
console.log(JSON.stringify(out, null, 2));
