import { chromium } from 'playwright';

const URL = 'http://localhost:5220/c/new';
const W = 1440, H = 900;
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(8000);

const out = {};

// left sidebar: the wrapper that actually reserves layout width
const leftBox = () => page.evaluate(() => {
  const nav = document.querySelector('#chat-history-nav');
  const inner = document.querySelector('div.nav');
  // outermost wrapper that sits at x~0 and is full height
  let wrapper = null;
  if (inner) {
    let p = inner;
    while (p && p.parentElement) {
      const r = p.getBoundingClientRect();
      if (r.x > 5 || r.height < window.innerHeight * 0.8) break;
      wrapper = p; p = p.parentElement;
      const pr = p.getBoundingClientRect();
      if (pr.width > 400) break;
    }
  }
  const g = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { cls: String(el.className).slice(0,150), id: el.id, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1),
      display: cs.display, transform: cs.transform, visibility: cs.visibility, opacity: cs.opacity, width: cs.width, position: cs.position, overflow: cs.overflowX }; };
  // main content left edge tells us how much space the sidebar reserves
  const main = document.querySelector('main') || document.querySelector('[role="main"]');
  const field = document.querySelector('.field');
  const fr = field ? field.getBoundingClientRect() : null;
  return {
    nav: g(nav), inner: g(inner), wrapper: g(wrapper), main: g(main),
    field: fr ? { x:+fr.x.toFixed(1), y:+fr.y.toFixed(1), w:+fr.width.toFixed(1), right:+fr.right.toFixed(1) } : null,
    // any element rendering at x<60 spanning full height (rail candidate)
    railCandidates: [...document.querySelectorAll('div,nav,aside')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > window.innerHeight * 0.7 && r.width > 0 && r.width <= 120 && r.x >= -5 && r.x < 60;
    }).slice(0, 6).map(g)
  };
});

out.open = await leftBox();
await page.screenshot({ path: SHOT + '/c-open.png' });

// click Close sidebar (the visible one)
const closed = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    const l = (b.getAttribute('aria-label') || '').toLowerCase();
    const r = b.getBoundingClientRect();
    if (l === 'close sidebar' && r.width > 0) { b.setAttribute('data-probe', 'close'); return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
  }
  return null;
});
out.closeBtn = closed;
await page.click('[data-probe="close"]').catch(e => out.err1 = String(e).slice(0,120));
await sleep(1800);
out.collapsed = await leftBox();
await page.screenshot({ path: SHOT + '/c-collapsed.png' });

// what visible controls remain in the left 0..120 strip?
out.collapsedStrip = await page.evaluate(() => {
  const res = [];
  for (const el of document.querySelectorAll('button, a, [role="button"], nav, aside')) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    if (r.x < 120 && r.right > -5 && r.x > -200) res.push({ tag: el.tagName.toLowerCase(), label: el.getAttribute('aria-label') || (el.innerText||'').trim().slice(0,20), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) });
  }
  return res.slice(0, 20);
});

// find the open-sidebar control now
out.openBtnAfter = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    const l = (b.getAttribute('aria-label') || '').toLowerCase();
    const r = b.getBoundingClientRect();
    if (/open sidebar|close sidebar|toggle/.test(l) && r.width > 0) { b.setAttribute('data-probe2','1'); return { label: l, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
  }
  return null;
});

await page.click('[data-probe2="1"]').catch(()=>{});
await sleep(1500);
out.reopened = await leftBox();

// ===== composer stability, careful sequence incl. return to chat =====
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(8000);
const fieldBox = () => page.evaluate(() => { const e = document.querySelector('.field'); if (!e) return null; const r = e.getBoundingClientRect();
  return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1) }; });

out.tabsPresent = await page.evaluate(() => [...document.querySelectorAll('button,[role="tab"],a')]
  .filter(el => { const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; })
  .map(el => (el.innerText||'').trim()).filter(t => t && t.length < 20 && /^(chat|search|news|research|deep research|study)$/i.test(t)));

const seq = ['chat', 'search', 'news', 'chat', 'search'];
out.seq = [];
for (const name of seq) {
  const ok = await page.evaluate((n) => {
    for (const el of document.querySelectorAll('button,[role="tab"],a')) {
      const t = (el.innerText||'').trim().toLowerCase();
      const r = el.getBoundingClientRect();
      if (t === n && r.width > 0) { el.setAttribute('data-tabprobe', n); return true; }
    }
    return false;
  }, name);
  if (!ok) { out.seq.push({ tab: name, missing: true }); continue; }
  await page.click(`[data-tabprobe="${name}"]`).catch(e => {});
  await sleep(1400);
  out.seq.push({ tab: name, field: await fieldBox() });
}

// mode-row / composer wrapper geometry to explain the shift
out.composerWrap = await page.evaluate(() => {
  const f = document.querySelector('.field');
  if (!f) return null;
  const chain = [];
  let el = f;
  for (let i = 0; i < 5 && el; i++) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    chain.push({ cls: String(el.className).slice(0,110), x:+r.x.toFixed(1), w:+r.width.toFixed(1),
      maxW: cs.maxWidth, pad: cs.paddingLeft + '/' + cs.paddingRight, w_css: cs.width });
    el = el.parentElement;
  }
  return chain;
});

out.pageErrors = pageErrors;
await page.screenshot({ path: SHOT + '/c-final.png' });
console.log(JSON.stringify(out, null, 2));
await browser.close();
