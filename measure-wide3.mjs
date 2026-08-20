import { chromium } from 'playwright';
const W = 2560, H = 1440;
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const out = { pageerrors: [], modes: [], extra: {} };

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
page.on('pageerror', e => out.pageerrors.push(String(e && e.message || e)));

await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await sleep(9000);
await page.waitForSelector('.field', { state: 'visible', timeout: 15000 });
await sleep(2500);

const LIB = `
window.__rr = r => ({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)});
window.__probe = () => {
  const f = document.querySelector('.field');
  const form = document.querySelector('form');
  const comp = document.querySelector('.hz-composer');
  const ta = document.querySelector('#prompt-textarea');
  const g = e => e ? window.__rr(e.getBoundingClientRect()) : null;
  const cs = e => e ? (c => ({maxW:c.maxWidth, w:c.width, pl:c.paddingLeft, pr:c.paddingRight, ml:c.marginLeft, mr:c.marginRight}))(getComputedStyle(e)) : null;
  // scroll container of the message pane
  const panes = [...document.querySelectorAll('*')].filter(e => { const c=getComputedStyle(e); return (c.overflowY==='auto'||c.overflowY==='scroll') && e.clientHeight>200; })
     .map(e => ({ cls:(e.getAttribute('class')||'').slice(0,60), cw:e.clientWidth, ow:e.offsetWidth, sh:e.scrollHeight, ch:e.clientHeight, scrollbar: e.offsetWidth-e.clientWidth }));
  return { field:g(f), fieldCS:cs(f), form:g(form), formCS:cs(form), comp:g(comp), ta:g(ta), panes,
           docSW: document.documentElement.scrollWidth, docCW: document.documentElement.clientWidth };
};
// anything visibly covering the composer?
window.__cover = () => {
  const f = document.querySelector('.field'); if(!f) return null;
  const r = f.getBoundingClientRect();
  const pts = [[r.x+5,r.y+5],[r.right-5,r.y+5],[r.x+5,r.bottom-5],[r.right-5,r.bottom-5],[(r.x+r.right)/2,(r.y+r.bottom)/2]];
  return pts.map(([x,y]) => { const el = document.elementFromPoint(x,y); return el ? { pt:[x,y], hit: el.tagName.toLowerCase()+'.'+(el.getAttribute('class')||'').split(' ').slice(0,2).join('.'), insideField: f.contains(el)||el===f } : {pt:[x,y],hit:null}; });
};
`;
await page.evaluate(LIB);

const click = async (n) => {
  for (const s of [`button:text-is("${n}")`, `[role="tab"]:text-is("${n}")`, `button:has-text("${n}")`]) {
    const l = page.locator(s).first();
    if (await l.count()) { try { await l.click({ timeout: 4000 }); return s; } catch {} }
  }
  return false;
};

for (const m of ['Chat', 'Search', 'News', 'Chat', 'Search', 'Chat']) {
  const ok = await click(m);
  if (!ok) { out.modes.push({ mode: m, found: false }); continue; }
  await sleep(1500);
  out.modes.push({ mode: m, found: true, via: ok, ...(await page.evaluate('window.__probe()')) });
  await page.screenshot({ path: `${SHOT}/mode-${m}-${out.modes.length}.png` });
}

out.extra.cover = await page.evaluate('window.__cover()');
out.extra.finalProbe = await page.evaluate('window.__probe()');

// screenshot of just the composer region + full page
await page.screenshot({ path: `${SHOT}/w-final-full.png` });
const fb = await page.locator('.field').first().boundingBox();
await page.screenshot({ path: `${SHOT}/w-composer.png`, clip: { x: Math.max(0, fb.x - 120), y: Math.max(0, fb.y - 130), width: Math.min(W, fb.width + 240), height: Math.min(H - fb.y + 130, fb.height + 260) } });

console.log(JSON.stringify(out, null, 1));
await browser.close();
