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

const snap = () => page.evaluate(() => {
  const g = (el, tag) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { k: tag, cls: String(el.className).slice(0, 130), id: el.id,
      x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1),
      display: cs.display, transform: cs.transform, vis: cs.visibility, op: cs.opacity, cssW: cs.width, pos: cs.position }; };
  const navHist = document.querySelector('#chat-history-nav');
  const navDiv  = document.querySelector('div.nav');
  // outer layout wrapper: parent chain of div.nav up to the first >400px wide
  let wrap = null;
  if (navDiv) { let p = navDiv.parentElement; for (let i=0;i<4 && p;i++){ const r=p.getBoundingClientRect(); if (r.width>500) break; wrap = p; p = p.parentElement; } }
  const field = document.querySelector('.field');
  const fr = field && field.getBoundingClientRect();
  return {
    navHist: g(navHist,'#chat-history-nav'), navDiv: g(navDiv,'div.nav'), wrap: g(wrap,'wrapper'),
    field: fr ? { x:+fr.x.toFixed(1), y:+fr.y.toFixed(1), w:+fr.width.toFixed(1), h:+fr.height.toFixed(1), right:+fr.right.toFixed(1), bottom:+fr.bottom.toFixed(1) } : null,
    hzComposer: g(document.querySelector('.hz-composer'), '.hz-composer'),
    railStrip: [...document.querySelectorAll('div,nav,aside')].filter(el => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.height > 600 && r.width > 0 && r.width <= 140 && r.x >= -10 && r.x < 80 && cs.visibility !== 'hidden' && cs.display !== 'none';
    }).slice(0,5).map(el => g(el,'rail')),
    leftControls: [...document.querySelectorAll('button,a,[role="button"]')].filter(el => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width>0 && r.height>0 && r.x < 140 && cs.visibility!=='hidden' && cs.display!=='none' && parseFloat(cs.opacity)>0;
    }).slice(0,14).map(el => { const r = el.getBoundingClientRect(); return { l: el.getAttribute('aria-label') || (el.innerText||'').trim().slice(0,18) || el.tagName, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; })
  };
});

out.open = await snap();
await page.screenshot({ path: SHOT + '/d-open.png' });

// ---- collapse ----
out.closeBtn = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    const l = (b.getAttribute('aria-label')||'').toLowerCase(); const r = b.getBoundingClientRect();
    if (l.includes('close sidebar') && r.width>0 && r.height>0) { b.setAttribute('data-probe','close');
      return { label:l, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
  }
  return null;
});
if (out.closeBtn) {
  await page.click('[data-probe="close"]', { timeout: 8000 }).catch(e => out.errClose = String(e).slice(0,100));
  await sleep(2000);
  out.collapsed = await snap();
  await page.screenshot({ path: SHOT + '/d-collapsed.png' });
  out.openBtn = await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      const l = (b.getAttribute('aria-label')||'').toLowerCase(); const r = b.getBoundingClientRect();
      if (/open sidebar|close sidebar/.test(l) && r.width>0 && r.height>0) { b.setAttribute('data-probe2','1');
        return { label:l, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; }
    }
    return null;
  });
  if (out.openBtn) { await page.click('[data-probe2="1"]', { timeout: 8000 }).catch(()=>{}); await sleep(1800); out.reopened = await snap(); }
}
out.pageErrors = pageErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();
