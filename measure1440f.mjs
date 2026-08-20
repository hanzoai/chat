import { chromium } from 'playwright';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.field', { timeout: 60000 });
await sleep(8000);

const chain = () => page.evaluate(() => {
  const f = document.querySelector('.field');
  const out = []; let el = f;
  for (let i = 0; i < 6 && el; i++) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    out.push({ cls: String(el.className).slice(0, 95), x: +r.x.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      padX: cs.paddingLeft + '/' + cs.paddingRight, marX: cs.marginLeft + '/' + cs.marginRight,
      maxW: cs.maxWidth, bw: cs.borderTopWidth + '/' + cs.borderLeftWidth });
    el = el.parentElement;
  }
  return out;
});

const res = { chat: null, search: null };
res.chat = await chain();
await page.screenshot({ path: SHOT + '/f-chat.png' });

await page.evaluate(() => {
  for (const el of document.querySelectorAll('button,[role="tab"],a')) {
    if ((el.innerText||'').trim().toLowerCase() === 'search' && el.getBoundingClientRect().width > 0) { el.setAttribute('data-t','s'); return; }
  }
});
await page.click('[data-t="s"]');
await sleep(1500);
res.search = await chain();
await page.screenshot({ path: SHOT + '/f-search.png' });

console.log(JSON.stringify(res, null, 2));
await browser.close();
