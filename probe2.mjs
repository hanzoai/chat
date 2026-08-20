import { chromium } from 'playwright';
const URL = 'http://localhost:5220/c/new';
const W = 390, H = 844;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + (e.message || e)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(14000);

const dump = await page.evaluate(`(() => {
  const out = {};
  const rr = r => ({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)});
  const f = document.querySelector('.field');
  out.field = f ? rr(f.getBoundingClientRect()) : null;
  out.fieldHTML = f ? f.outerHTML.slice(0, 1500) : null;
  out.allControls = [];
  for (const el of document.querySelectorAll('button,[role=tab],[role=button],a[href],input,textarea,select')) {
    const cs = getComputedStyle(el);
    if (cs.display==='none'||cs.visibility==='hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width<1||r.height<1) continue;
    out.allControls.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className||'').toString().slice(0,90),
      tid: el.getAttribute('data-testid')||'',
      aria: el.getAttribute('aria-label')||'',
      role: el.getAttribute('role')||'',
      txt: (el.innerText||'').trim().slice(0,30),
      ...rr(r)
    });
  }
  const foot = document.querySelector('footer,[class*=footer]');
  out.footer = foot ? { cls:(foot.className||'').toString().slice(0,100), ...rr(foot.getBoundingClientRect()) } : null;
  out.bodyText = document.body.innerText.slice(0, 1200);
  return out;
})()`);

console.log(JSON.stringify({ errs, dump }, null, 2));
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/p2.png' });
await browser.close();
