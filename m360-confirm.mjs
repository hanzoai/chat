import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + (e.message||e)));
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.field', { timeout: 45000 });
await page.waitForTimeout(6000);

const r = await page.evaluate(`(() => {
  const rr=r=>({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)});
  const out={};
  // tap targets under 44, with computed padding, for the product surface only
  out.small=[];
  for (const el of document.querySelectorAll('button,a[href],[role=tab]')) {
    if (el.closest('.ReactQueryDevtools,[class*=ReactQueryDevtools],#chat-history-nav')) continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||cs.pointerEvents==='none') continue;
    const b=el.getBoundingClientRect(); if(b.width<1||b.height<1) continue;
    if(b.width<44||b.height<44) out.small.push({label:(el.getAttribute('aria-label')||el.innerText||'').trim().slice(0,30),
      tag:el.tagName.toLowerCase(), w:+b.width.toFixed(1),h:+b.height.toFixed(1), y:+b.y.toFixed(1), fs:parseFloat(cs.fontSize), pad:cs.padding, display:cs.display});
  }
  // prompt chip row clipping
  out.chips=[];
  for (const el of document.querySelectorAll('button')) {
    if(!/truncate|rounded-full/.test(String(el.className))) continue;
    const b=el.getBoundingClientRect(); if(b.width<1) continue;
    if(el.scrollWidth>el.clientWidth+1) out.chips.push({label:el.innerText.trim().slice(0,30), sw:el.scrollWidth, cw:el.clientWidth, ...rr(b)});
  }
  // any scrollable row that actually overflows (real horizontal clipping of content)
  out.hscroll=[];
  for (const el of document.querySelectorAll('*')) {
    if(el.closest('.ReactQueryDevtools,[class*=ReactQueryDevtools]')) continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') continue;
    if(!/auto|scroll/.test(cs.overflowX)) continue;
    if(el.scrollWidth>el.clientWidth+1) out.hscroll.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,60),sw:el.scrollWidth,cw:el.clientWidth});
  }
  const f=document.querySelector('.field');
  out.field=f?rr(f.getBoundingClientRect()):null;
  return out;
})()`);

// composer stability across the interactions that exist at 360
const ys = [];
const push = async (tag) => { ys.push({ tag, y: await page.evaluate(`document.querySelector('.field').getBoundingClientRect().y`) }); };
await push('initial');
await page.locator('textarea').first().click();
await page.waitForTimeout(600);
await push('after-focus-textarea');
await page.locator('textarea').first().fill('hello world');
await page.waitForTimeout(600);
await push('after-typing');
await page.locator('textarea').first().fill('');
await page.waitForTimeout(600);
await push('after-clear');

console.log(JSON.stringify({ errs, ...r, composerY: ys,
  spread: +(Math.max(...ys.map(v=>v.y)) - Math.min(...ys.map(v=>v.y))).toFixed(1) }, null, 2));
await browser.close();
