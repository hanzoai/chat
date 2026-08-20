import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [label, url, w, h] of [
  ['laptop /c/new', 'http://localhost:5220/c/new', 1440, 900],
  ['desktop /c/new', 'http://localhost:5220/c/new', 1920, 1080],
  ['laptop /', 'http://localhost:5220/', 1440, 900],
  ['mobile /', 'http://localhost:5220/', 390, 844],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(14000);
  const r = await p.evaluate(() => {
    const f = document.querySelector('.field');
    const n = document.querySelector('nav');
    const ta = document.querySelector('textarea');
    return {
      url: location.pathname,
      field: f ? Math.round(f.getBoundingClientRect().width) : null,
      nav: n ? Math.round(n.getBoundingClientRect().width) : null,
      textarea: !!ta,
      bodyText: document.body.innerText.slice(0, 60).replace(/\n/g, ' '),
    };
  });
  console.log(label.padEnd(16), JSON.stringify(r), errs.length ? 'ERR:' + errs[0] : '');
  await p.close();
}
await b.close();
