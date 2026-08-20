import { chromium } from 'playwright';

const W = 1920, H = 1080;
const URL = 'http://localhost:5220/c/new';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e && e.stack ? e.stack.split('\n')[0] : e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

const out = {};

// 1. overflow
out.overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return {
    docScrollWidth: de.scrollWidth,
    docClientWidth: de.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    docScrollHeight: de.scrollHeight,
    docClientHeight: de.clientHeight,
  };
});

// offenders beyond viewport
out.offenders = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (r.right > vw + 1 || r.left < -1) {
      res.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 120),
        id: el.id,
        aria: el.getAttribute('aria-label'),
        x: +r.x.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        scrollW: el.scrollWidth, clientW: el.clientWidth,
        overflowX: cs.overflowX,
      });
    }
  }
  return res.slice(0, 60);
});

// composer .field
out.field = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.field')];
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 200),
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
      bg: cs.backgroundColor, color: cs.color, pos: cs.position, z: cs.zIndex,
    };
  });
});

// general structure dump: main landmarks
out.landmarks = await page.evaluate(() => {
  const sel = ['nav', 'aside', 'main', 'header', 'footer', 'form', '[role="tablist"]', '[role="tab"]'];
  const res = [];
  for (const s of sel) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      res.push({
        sel: s, tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 100),
        text: (el.innerText || '').slice(0, 60).replace(/\n/g, '|'),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      });
    }
  }
  return res;
});

out.pageErrors = pageErrors;
out.consoleErrors = consoleErrors;
out.title = await page.title();
out.url = page.url();

await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/desktop-1920.png', fullPage: false });

console.log(JSON.stringify(out, null, 2));
await browser.close();
