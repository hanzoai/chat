import { chromium } from 'playwright';

const URL = 'http://localhost:5220/c/new';
const W = 1440, H = 900;
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const pageErrors = [], consoleErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.stack ? e.stack.split('\n').slice(0,3).join(' | ') : e).slice(0, 400)));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240)); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(8000);

const out = {};

// ============ shared collector installed in page ============
await page.addInitScript(() => {});

const COLLECT = () => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const desc = (el) => {
    const cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : String(el.className || '');
    return (el.getAttribute('aria-label') || el.getAttribute('title') || (el.innerText || '').trim().slice(0, 24) || el.tagName.toLowerCase()) +
      ' [' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.trim().split(/\s+/).slice(0, 3).join('.') : '') + ']';
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    if (cs.pointerEvents === 'none') return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    if (el.closest('.sr-only')) return false;
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
    // clipped by an ancestor with overflow hidden and zero-ish intersection
    let p = el.parentElement;
    const r = el.getBoundingClientRect();
    while (p && p !== document.documentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflow !== 'visible' || pcs.overflowX !== 'visible' || pcs.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        const ix = Math.min(r.right, pr.right) - Math.max(r.left, pr.left);
        const iy = Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top);
        if (ix <= 1 || iy <= 1) return false;
      }
      if (parseFloat(pcs.opacity) === 0 || pcs.visibility === 'hidden' || pcs.display === 'none') return false;
      p = p.parentElement;
    }
    return true;
  };
  const ctrls = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], input, textarea, select, [role="menuitem"], [role="switch"], [role="link"]')];
  const items = [];
  for (const el of ctrls) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    items.push({
      el, name: desc(el),
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
      fs: +parseFloat(cs.fontSize).toFixed(1), pos: cs.position, z: cs.zIndex
    });
  }
  return { vw, vh, items };
};

// ============ 4. SIDEBAR ============
out.sidebar = await page.evaluate(() => {
  const sels = ['nav', '[data-testid*="nav"]', 'aside', '[class*="sidebar"]', '#controls-nav'];
  const found = [];
  for (const s of sels) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.height < 100) continue;
      found.push({ sel: s, tag: el.tagName.toLowerCase(), id: el.id, cls: String(el.className).slice(0, 100),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1) });
    }
  }
  const toggles = [...document.querySelectorAll('button, [role="button"]')].filter(b => {
    const t = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.dataset.testid || '')).toLowerCase();
    return /sidebar|nav|toggle|collaps|menu|drawer/.test(t);
  }).map(b => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label') || b.getAttribute('title') || b.dataset.testid, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), vis: r.width>0&&r.height>0 }; });
  return { found, toggles };
});

// find the sidebar root reliably: widest full-height element on the left
out.sidebarGuess = await page.evaluate(() => {
  let best = null;
  for (const el of document.querySelectorAll('div, nav, aside')) {
    const r = el.getBoundingClientRect();
    if (r.height > window.innerHeight * 0.7 && r.x < 40 && r.width > 40 && r.width < 500) {
      if (!best || r.width > best.w) best = { tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0,120), x:+r.x.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), id: el.id };
    }
  }
  return best;
});

const sidebarBox = () => page.evaluate(() => {
  const pick = (s) => document.querySelector(s);
  const el = pick('#controls-nav') || pick('nav') || pick('aside');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { tag: el.tagName.toLowerCase(), id: el.id, cls: String(el.className).slice(0,140),
    x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1),
    display: cs.display, transform: cs.transform, vis: cs.visibility, opacity: cs.opacity };
});

out.sidebarOpen = await sidebarBox();

// Try clicking the toggle
const toggleSel = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('button, [role="button"]')];
  for (const b of cands) {
    const t = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.dataset.testid || '')).toLowerCase();
    const r = b.getBoundingClientRect();
    if (/sidebar|collaps|drawer/.test(t) && r.width > 0) {
      b.setAttribute('data-probe-toggle', '1');
      return b.getAttribute('aria-label') || b.getAttribute('title') || b.dataset.testid;
    }
  }
  return null;
});
out.toggleLabel = toggleSel;

if (toggleSel) {
  await page.click('[data-probe-toggle="1"]', { timeout: 5000 }).catch(e => out.toggleClickErr = String(e).slice(0,150));
  await sleep(1500);
  out.sidebarCollapsed = await sidebarBox();
  await page.screenshot({ path: SHOT + '/shot-1440-collapsed.png' });
  // toggle back
  const back = await page.evaluate(() => {
    const b = document.querySelector('[data-probe-toggle="1"]');
    if (b) { const r = b.getBoundingClientRect(); return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
    // toggle button may have been replaced; find any sidebar toggle again
    for (const el of document.querySelectorAll('button,[role="button"]')) {
      const t = ((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.dataset.testid||'')).toLowerCase();
      if (/sidebar|collaps|drawer/.test(t)) { el.setAttribute('data-probe-toggle','1'); const r = el.getBoundingClientRect(); return { relabeled:true, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
    }
    return null;
  });
  out.toggleAfterCollapse = back;
  await page.click('[data-probe-toggle="1"]', { timeout: 5000 }).catch(() => {});
  await sleep(1200);
  out.sidebarReopened = await sidebarBox();
}

// ============ 5/6/7/8 on the OPEN default state ============
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(8000);

const analysis = await page.evaluate(`(${COLLECT.toString()})()`);
out.viewportRead = { vw: analysis.vw, vh: analysis.vh };

// need element refs in page for overlap; redo entirely in page
out.geom = await page.evaluate(`(() => {
  const collect = ${COLLECT.toString()};
  const { vw, vh, items } = collect();
  const res = { count: items.length, offscreen: [], small: [], overlaps: [], smallFont: [] };
  for (const it of items) {
    if (it.x < -0.5 || it.y < -0.5 || it.right > vw + 0.5 || it.bottom > vh + 0.5) {
      res.offscreen.push({ name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, right: it.right, bottom: it.bottom });
    }
    if (it.w < 44 || it.h < 44) res.small.push({ name: it.name, w: it.w, h: it.h, x: it.x, y: it.y });
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ix = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      if (ix > 0.5 && iy > 0.5) {
        res.overlaps.push({ a: a.name, b: b.name, ix: +ix.toFixed(1), iy: +iy.toFixed(1),
          aBox: [a.x, a.y, a.w, a.h], bBox: [b.x, b.y, b.w, b.h] });
      }
    }
  }
  res.overlaps = res.overlaps.slice(0, 40);
  return res;
})()`);

// ============ 8. small fonts + truncation ============
out.text = await page.evaluate(() => {
  const small = [], trunc = [];
  const seenS = new Set();
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('.sr-only') || el.getAttribute('aria-hidden') === 'true') continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasText) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 11) {
        const k = el.tagName + '|' + String(el.className).slice(0,40) + '|' + fs;
        if (!seenS.has(k)) { seenS.add(k);
          small.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70), fs: +fs.toFixed(2), text: (el.innerText||'').trim().slice(0, 40), x:+r.x.toFixed(0), y:+r.y.toFixed(0) }); }
      }
      // truncation: content wider than box with overflow hidden / ellipsis
      if ((cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.overflowX === 'hidden')
          && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        trunc.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70),
          scrollW: el.scrollWidth, clientW: el.clientWidth, text: (el.innerText||'').trim().slice(0, 50), x:+r.x.toFixed(0), y:+r.y.toFixed(0) });
      }
    }
  }
  return { small: small.slice(0, 30), trunc: trunc.slice(0, 30) };
});

out.pageErrors = pageErrors;
out.consoleErrors = consoleErrors.slice(0, 25);

await page.screenshot({ path: SHOT + '/shot-1440-default.png', fullPage: false });

console.log(JSON.stringify(out, null, 2));
await browser.close();
