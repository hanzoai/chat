import { chromium } from 'playwright';

const URL = 'http://localhost:5220/c/new';
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.field', { timeout: 60000 });
await sleep(8000);

const out = {};

// devtools button identity
out.devtools = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||'').includes('React Query'));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  let root = b; while (root.parentElement && root.parentElement !== document.body) root = root.parentElement;
  return { label: b.getAttribute('aria-label'), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
    rootTag: root.tagName.toLowerCase(), rootCls: String(root.className).slice(0,80), rootId: root.id,
    outerHTMLHead: b.outerHTML.slice(0, 120) };
});

// broad truncation sweep (any element, any depth)
out.trunc = await page.evaluate(() => {
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    if (el.closest('.sr-only')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    if (!clipsX) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      const txt = (el.textContent || '').trim();
      if (!txt) continue;
      res.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70),
        scrollW: el.scrollWidth, clientW: el.clientWidth, over: el.scrollWidth - el.clientWidth,
        ellipsis: cs.textOverflow, text: txt.slice(0, 60), x:+r.x.toFixed(0), y:+r.y.toFixed(0), w:+r.width.toFixed(0) });
    }
  }
  return res.slice(0, 25);
});

// vertical scroll containers overflowing viewport height / composer under footer?
out.footer = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a')].filter(a => /privacy|terms|hanzo chat v/i.test(a.innerText||''));
  const f = document.querySelector('.field');
  const fr = f && f.getBoundingClientRect();
  return {
    field: fr ? { y:+fr.y.toFixed(1), bottom:+fr.bottom.toFixed(1) } : null,
    links: links.map(a => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
      return { t:(a.innerText||'').trim().slice(0,30), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), bottom:+r.bottom.toFixed(1), fs: cs.fontSize }; })
  };
});

// smallest font sizes present overall (top 12 ascending) on text-bearing nodes
out.fonts = await page.evaluate(() => {
  const m = new Map();
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    if (el.closest('.sr-only')) continue;
    const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!direct) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const fs = +parseFloat(cs.fontSize).toFixed(2);
    const k = fs + '|' + el.tagName;
    if (!m.has(k)) m.set(k, { fs, tag: el.tagName.toLowerCase(), text: (el.innerText||'').trim().slice(0,35), cls: String(el.className).slice(0,50) });
  }
  return [...m.values()].sort((a,b) => a.fs - b.fs).slice(0, 12);
});

// full-page vertical: does content overflow 900 causing a scrollbar that eats width?
out.scroll = await page.evaluate(() => ({
  docScrollH: document.documentElement.scrollHeight, docClientH: document.documentElement.clientHeight,
  docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth,
  bodyOverflow: getComputedStyle(document.body).overflow
}));

out.pageErrors = pageErrors;
await page.screenshot({ path: SHOT + '/e-default.png' });
console.log(JSON.stringify(out, null, 2));
await browser.close();
