import { chromium } from 'playwright';
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = { pageerrors: [], modes: {} };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 2560, height: 1440 } })).newPage();
page.on('pageerror', e => out.pageerrors.push(String(e && e.message || e)));
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await sleep(9000);
await page.waitForSelector('.field', { state: 'visible', timeout: 15000 });
await sleep(2500);

const PROBE = `(() => {
  const f = document.querySelector('.field');
  const rr = r => ({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)});
  const vis = e => { const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const r=e.getBoundingClientRect(); return r.width>0.5&&r.height>0.5; };
  const desc = e => { let s=e.tagName.toLowerCase(); if(e.id)s+='#'+e.id; const al=e.getAttribute('aria-label'); if(al)s+='[aria-label="'+al+'"]'; const ph=e.getAttribute('placeholder'); if(ph)s+='[placeholder="'+ph+'"]'; const t=(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,30); if(t)s+=' {'+t+'}'; return s; };
  return {
    field: f ? rr(f.getBoundingClientRect()) : null,
    fieldHTMLHead: f ? f.outerHTML.slice(0, 300) : null,
    inputsInField: f ? [...f.querySelectorAll('input, textarea, [contenteditable="true"]')].map(e=>({sel:desc(e), vis:vis(e), box: rr(e.getBoundingClientRect()), fs:getComputedStyle(e).fontSize})) : [],
    btnsInField: f ? [...f.querySelectorAll('button')].filter(vis).map(e=>({sel:desc(e), box: rr(e.getBoundingClientRect())})) : [],
    activeTab: [...document.querySelectorAll('button')].filter(vis).filter(b=>['Chat','Search','News'].includes((b.innerText||'').trim())).map(b=>({t:(b.innerText||'').trim(), cls:(b.getAttribute('class')||'').slice(0,180), aria: b.getAttribute('aria-selected'), box:rr(b.getBoundingClientRect())})),
    docSW: document.documentElement.scrollWidth, docCW: document.documentElement.clientWidth,
  };
})()`;

const click = async n => { for (const s of [`button:text-is("${n}")`, `button:has-text("${n}")`]) { const l = page.locator(s).first(); if (await l.count()) { try { await l.click({ timeout: 4000 }); return true; } catch {} } } return false; };

for (const m of ['Chat', 'Search', 'News']) {
  await click(m); await sleep(1600);
  out.modes[m] = await page.evaluate(PROBE);
  const fb = await page.locator('.field').first().boundingBox();
  await page.screenshot({ path: `${SHOT}/mode2-${m}.png`, clip: { x: fb.x - 150, y: fb.y - 150, width: fb.width + 300, height: fb.height + 300 } });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
