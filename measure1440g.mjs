import { chromium } from 'playwright';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.field', { timeout: 60000 });
await sleep(8000);

const probe = () => page.evaluate(() => {
  const f = document.querySelector('.field');
  const fr = f.getBoundingClientRect();
  // mode tab row: the row containing the button labelled Chat
  let chatBtn = null;
  for (const el of document.querySelectorAll('button,[role="tab"],a')) {
    if ((el.innerText||'').trim().toLowerCase() === 'chat' && el.getBoundingClientRect().width > 0) { chatBtn = el; break; }
  }
  const cb = chatBtn && chatBtn.getBoundingClientRect();
  const row = chatBtn && chatBtn.parentElement;
  const rr = row && row.getBoundingClientRect();
  // inner text span of the chat button (visual left edge of the label)
  const span = chatBtn && chatBtn.querySelector('span');
  const sr = span && span.getBoundingClientRect();
  // pills row
  const pills = [...document.querySelectorAll('button')].filter(b => /^(summarize|write code|explain|brainstorm|build an app)$/i.test((b.innerText||'').trim()))
    .map(b => { const r = b.getBoundingClientRect(); return { t:(b.innerText||'').trim(), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; });
  return {
    field: { x:+fr.x.toFixed(1), y:+fr.y.toFixed(1), w:+fr.width.toFixed(1), h:+fr.height.toFixed(1), right:+fr.right.toFixed(1), bottom:+fr.bottom.toFixed(1) },
    chatBtn: cb ? { x:+cb.x.toFixed(1), y:+cb.y.toFixed(1), w:+cb.width.toFixed(1), h:+cb.height.toFixed(1) } : null,
    chatLabel: sr ? { x:+sr.x.toFixed(1), right:+sr.right.toFixed(1) } : null,
    tabRow: rr ? { x:+rr.x.toFixed(1), y:+rr.y.toFixed(1), w:+rr.width.toFixed(1), h:+rr.height.toFixed(1), cls: String(row.className).slice(0,80) } : null,
    pills
  };
});

const out = {};
out.chat = await probe();
for (const mode of ['search', 'news']) {
  await page.evaluate((m) => {
    for (const el of document.querySelectorAll('button,[role="tab"],a')) {
      if ((el.innerText||'').trim().toLowerCase() === m && el.getBoundingClientRect().width > 0) { el.setAttribute('data-t', m); return; }
    }
  }, mode);
  await page.click(`[data-t="${mode}"]`);
  await sleep(1500);
  out[mode] = await probe();
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
