import { chromium } from 'playwright';

const W = 360, H = 740;
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
page.on('pageerror', e => errs.push('PAGEERROR: ' + (e.message || e)));

await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.field', { timeout: 45000 });
await page.waitForTimeout(6000);

const AUDIT = `(() => {
  const W = window.innerWidth, H = window.innerHeight;
  const rr = r => ({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)});
  const inDev = el => !!el.closest('.ReactQueryDevtools, [class*=ReactQueryDevtools]');
  const inDrawer = el => !!el.closest('#chat-history-nav, #chat-history-nav ~ *');
  const out = {};
  out.doc = { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyScrollWidth: document.body.scrollWidth };

  const f = document.querySelector('.field');
  out.field = f ? rr(f.getBoundingClientRect()) : null;
  const ta = document.querySelector('textarea');
  out.textarea = ta ? rr(ta.getBoundingClientRect()) : null;
  const footLinks = [...document.querySelectorAll('a')].filter(a => /Privacy policy|Terms of service/.test(a.textContent||''));
  out.footer = footLinks.map(a => ({ t:a.textContent.trim(), ...rr(a.getBoundingClientRect()), fs: parseFloat(getComputedStyle(a).fontSize) }));

  const mask = document.querySelector('.sidenav-mask');
  out.mask = mask ? { ...rr(mask.getBoundingClientRect()), pe: getComputedStyle(mask).pointerEvents, op: getComputedStyle(mask).opacity } : null;
  const nav = document.querySelector('#chat-history-nav');
  out.nav = nav ? rr(nav.getBoundingClientRect()) : null;
  const navHost = nav ? nav.closest('div.flex.h-full.flex-col') : null;
  out.navHost = navHost ? { ...rr(navHost.getBoundingClientRect()), w: navHost.getBoundingClientRect().width } : null;
  out.drawerA11y = nav ? { ariaHidden: nav.getAttribute('aria-hidden'), inert: nav.hasAttribute('inert'),
    tabbable: [...nav.querySelectorAll('button,a[href],input,textarea,select')].filter(e=>{const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&e.tabIndex>=0;}).length } : null;

  const controls = [];
  for (const el of document.querySelectorAll('button, a[href], [role=tab], input, textarea, select')) {
    const cs = getComputedStyle(el);
    if (cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||cs.pointerEvents==='none') continue;
    const r = el.getBoundingClientRect();
    if (r.width<1||r.height<1) continue;
    if (inDev(el)) continue;
    controls.push({ el, drawer: !!el.closest('#chat-history-nav'),
      label: (el.getAttribute('aria-label')||el.innerText||'').trim().slice(0,30),
      cls: String(el.className).slice(0,60), fs: parseFloat(cs.fontSize), rect: r });
  }
  out.controlCount = controls.length;

  out.overlaps = [];
  for (let i=0;i<controls.length;i++) for (let j=i+1;j<controls.length;j++) {
    const a=controls[i], b=controls[j];
    if (a.drawer!==b.drawer) continue;
    if (a.el.contains(b.el)||b.el.contains(a.el)) continue;
    const A=a.rect,B=b.rect;
    const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left), oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
    if (ox>1&&oy>1) out.overlaps.push({ a:a.label, b:b.label, ox:+ox.toFixed(1), oy:+oy.toFixed(1), ra:rr(A), rb:rr(B) });
  }
  out.offscreen = controls.filter(c=>{const r=c.rect;return r.left<-0.5||r.top<-0.5||r.right>W+0.5||r.bottom>H+0.5;})
    .map(c=>({label:c.label, drawer:c.drawer, ...rr(c.rect)}));
  out.smallTargets = controls.filter(c=>!c.drawer).filter(c=>c.rect.width<44||c.rect.height<44)
    .map(c=>({label:c.label, cls:c.cls, w:+c.rect.width.toFixed(1), h:+c.rect.height.toFixed(1), fs:c.fs}));

  out.tinyText = [];
  for (const el of document.querySelectorAll('*')) {
    if (inDev(el)) continue;
    const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length);
    if(!hasText) continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) continue;
    const r=el.getBoundingClientRect(); if(r.width<1&&r.height<1) continue;
    const fs=parseFloat(cs.fontSize);
    if(fs<11) out.tinyText.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,50),fs,txt:el.textContent.trim().slice(0,40)});
  }
  out.truncated=[];
  for (const el of document.querySelectorAll('*')) {
    if(inDev(el)) continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) continue;
    if(el.scrollWidth>el.clientWidth+1 && el.clientWidth>0)
      out.truncated.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,60),sw:el.scrollWidth,cw:el.clientWidth,ox:cs.overflowX,txt:(el.innerText||'').trim().slice(0,35)});
  }
  out.overflowers=[];
  for (const el of document.querySelectorAll('*')) {
    if(inDev(el)) continue;
    if(el.closest('#chat-history-nav')) continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) continue;
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) continue;
    if(r.right>W+0.5||r.left<-0.5) out.overflowers.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,60),aria:el.getAttribute('aria-label')||'',...rr(r)});
  }
  return out;
})()`;

const closed = await page.evaluate(AUDIT);

// composer stability: any mode tabs?
const modeTabs = await page.evaluate(`(() => {
  const words=['Chat','Search','News','Research'];
  return [...document.querySelectorAll('button,[role=tab]')].filter(el=>{
    const t=(el.textContent||'').trim(); if(!words.includes(t)) return false;
    const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
    return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;
  }).map(el=>el.textContent.trim());
})()`);

// sidebar toggle
await page.locator('button[aria-label="Open sidebar"]').first().click();
await page.waitForTimeout(1200);
const opened = await page.evaluate(AUDIT);

// can the sliver / mask close it?
const maskClickable = await page.evaluate(`(() => {
  const el = document.elementFromPoint(345, 400);
  return el ? el.tagName + '|' + String(el.className).slice(0,40) + '|' + (el.getAttribute('aria-label')||'') : 'null';
})()`);

await page.locator('#close-sidebar-button').first().click();
await page.waitForTimeout(1200);
const reclosed = await page.evaluate(AUDIT);

console.log(JSON.stringify({ errs, modeTabs, maskClickable,
  closed, opened: { doc:opened.doc, field:opened.field, mask:opened.mask, nav:opened.nav, navHost:opened.navHost,
                    offscreenCount:opened.offscreen.length, offscreen:opened.offscreen, overflowersCount:opened.overflowers.length },
  reclosed: { doc:reclosed.doc, field:reclosed.field, nav:reclosed.nav } }, null, 2));
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/m360-closed.png' });
await browser.close();
