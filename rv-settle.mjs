import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0,200)));
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
const snaps = [];
for (let t = 1; t <= 20; t++) {
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"], input, textarea, select, summary')];
    const visN = els.filter(el => { const r = el.getBoundingClientRect(); if (r.width<1||r.height<1) return false; const cs=getComputedStyle(el); return !(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0); }).length;
    const f = document.querySelector('.field');
    return { total: els.length, vis: visN, field: f ? +f.getBoundingClientRect().y.toFixed(1) : null, bodyLen: document.body.innerHTML.length };
  });
  snaps.push({ t, ...s });
}
console.log(JSON.stringify({ snaps, errs }, null, 2));
await browser.close();
