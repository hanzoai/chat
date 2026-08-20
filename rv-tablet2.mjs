import { chromium } from 'playwright';
import fs from 'fs';

const W = 768, H = 1024;
const URL = 'http://localhost:5220/c/new';
const SHOT = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(8000);
try { await page.waitForSelector('.field', { timeout: 15000, state: 'attached' }); } catch {}
await sleep(2500);

const R = {};

// ---- INJECT shared helpers ----
await page.addInitScript(() => {});
const HELPERS = `
window.__vis = function(el){
  const cs = getComputedStyle(el);
  if (cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false;
  if (el.getAttribute('aria-hidden')==='true') return false;
  let p = el.parentElement;
  while(p){ const c = getComputedStyle(p);
    if (c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false;
    p = p.parentElement; }
  const r = el.getBoundingClientRect();
  if (r.width<1||r.height<1) return false;
  return true;
};
window.__desc = function(el){
  return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role')||'',
    id: el.id||'', cls: (typeof el.className==='string'?el.className:'').slice(0,110),
    label: (el.getAttribute('aria-label')|| el.getAttribute('title') || el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,50) };
};
window.__ctrls = function(){
  const sel='button, a[href], [role="tab"], [role="button"], [role="menuitem"], input:not([type=hidden]), textarea, select';
  const out=[];
  for(const el of document.querySelectorAll(sel)){
    if(!window.__vis(el)) continue;
    if(el.hasAttribute('disabled')) continue;
    const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    out.push(Object.assign(window.__desc(el), { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), fs:cs.fontSize, pe:cs.pointerEvents, pos:cs.position, _i:out.length }));
  }
  return out;
};
`;
await page.evaluate(HELPERS);

// ---- field geometry ----
const fieldGeom = () => page.evaluate(() => {
  const els=[...document.querySelectorAll('.field')];
  return els.map(el=>{const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),
      cls:(typeof el.className==='string'?el.className:'').slice(0,150),bg:cs.backgroundColor,pos:cs.position};});
});
R.field = await fieldGeom();

R.fieldTopmost = await page.evaluate(() => {
  const el=document.querySelector('.field'); if(!el) return null;
  const r=el.getBoundingClientRect();
  const pts=[['top-center',r.x+r.width/2,r.y+3],['bottom-center',r.x+r.width/2,r.bottom-3],['left-mid',r.x+3,r.y+r.height/2],['right-mid',r.right-3,r.y+r.height/2],['center',r.x+r.width/2,r.y+r.height/2]];
  return pts.map(([n,x,y])=>{const t=document.elementFromPoint(x,y);
    return {n,x:+x.toFixed(0),y:+y.toFixed(0),tag:t?t.tagName.toLowerCase():null,cls:t&&typeof t.className==='string'?t.className.slice(0,80):'',inField: t? (el.contains(t)||t===el):false};});
});

// ---- enumerate the mode-tab row ----
R.tabRow = await page.evaluate(() => {
  // find element whose text is exactly "Chat" among buttons
  const btns=[...document.querySelectorAll('button,[role="tab"],a')].filter(e=>window.__vis(e));
  const chat=btns.find(e=>(e.textContent||'').trim().toLowerCase()==='chat');
  if(!chat) return null;
  const row=chat.parentElement;
  const kids=[...row.children].map(el=>{const r=el.getBoundingClientRect();
    return Object.assign(window.__desc(el),{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),vis:window.__vis(el)});});
  const rr=row.getBoundingClientRect(); const rcs=getComputedStyle(row);
  return { rowCls:(typeof row.className==='string'?row.className:'').slice(0,160), rowBox:{x:+rr.x.toFixed(1),y:+rr.y.toFixed(1),w:+rr.width.toFixed(1),h:+rr.height.toFixed(1)},
    scrollW: row.scrollWidth, clientW: row.clientWidth, overflowX: rcs.overflowX, kids };
});

// ---- controls snapshot ----
R.controls = await page.evaluate(() => window.__ctrls());

// ---- overlap (non-nested pairs only, confirmed by hit-test) ----
R.overlaps = await page.evaluate(() => {
  const sel='button, a[href], [role="tab"], [role="button"], input:not([type=hidden]), textarea, select';
  const els=[...document.querySelectorAll(sel)].filter(e=>window.__vis(e)&&!e.hasAttribute('disabled'));
  const res=[];
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
    const a=els[i],b=els[j];
    if(a.contains(b)||b.contains(a)) continue;
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    const ox=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);
    const oy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
    if(ox>1&&oy>1){
      // hit test the overlap centre: who actually wins?
      const cx=(Math.max(ra.left,rb.left)+Math.min(ra.right,rb.right))/2;
      const cy=(Math.max(ra.top,rb.top)+Math.min(ra.bottom,rb.bottom))/2;
      const t=document.elementFromPoint(cx,cy);
      res.push({ a:window.__desc(a), b:window.__desc(b),
        aBox:[+ra.x.toFixed(1),+ra.y.toFixed(1),+ra.width.toFixed(1),+ra.height.toFixed(1)],
        bBox:[+rb.x.toFixed(1),+rb.y.toFixed(1),+rb.width.toFixed(1),+rb.height.toFixed(1)],
        overlap:[+ox.toFixed(1),+oy.toFixed(1)],
        winner: t?window.__desc(t):null,
        stealsA: t? !a.contains(t)&&t!==a : null, stealsB: t? !b.contains(t)&&t!==b : null });
    }
  }
  return res;
});

// ---- tap targets ----
R.tapSmall = R.controls.filter(c => c.w < 44 || c.h < 44).map(c => ({...c}));

// ---- offscreen controls ----
R.offscreen = R.controls.filter(c => c.x < -0.5 || c.y < -0.5 || c.right > W + 0.5 || c.bottom > H + 0.5);

// ---- tiny fonts ----
R.tinyFonts = await page.evaluate(() => {
  const out=[]; const seen=new Set();
  for(const el of document.querySelectorAll('*')){
    if(!el.childNodes.length) continue;
    let hasText=false; for(const n of el.childNodes) if(n.nodeType===3 && n.textContent.trim()) hasText=true;
    if(!hasText) continue;
    if(!window.__vis(el)) continue;
    const cs=getComputedStyle(el); const fs=parseFloat(cs.fontSize);
    if(fs<11){ const r=el.getBoundingClientRect();
      const k=el.tagName+fs+r.x+r.y; if(seen.has(k))continue; seen.add(k);
      out.push(Object.assign(window.__desc(el),{fs:cs.fontSize,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),text:el.textContent.trim().slice(0,40)}));}
  }
  return out;
});

// ---- truncation / text clipping ----
R.truncated = await page.evaluate(() => {
  const out=[];
  for(const el of document.querySelectorAll('*')){
    if(!window.__vis(el)) continue;
    const cs=getComputedStyle(el);
    const clips = cs.overflow==='hidden'||cs.overflowX==='hidden'||cs.textOverflow==='ellipsis';
    if(!clips) continue;
    if(el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0){
      const txt=(el.textContent||'').trim();
      if(!txt) continue;
      const r=el.getBoundingClientRect();
      out.push(Object.assign(window.__desc(el),{scrollW:el.scrollWidth,clientW:el.clientWidth,textOverflow:cs.textOverflow,
        x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),text:txt.slice(0,50)}));
    }
  }
  return out.slice(0,30);
});

// ---- 3. composer stability across mode tabs (multi-cycle) ----
const tabs = await page.evaluate(() => {
  const names=['chat','search','news','research'];
  const out=[];
  for(const el of document.querySelectorAll('button,[role="tab"],a')){
    if(!window.__vis(el)) continue;
    const t=(el.textContent||'').trim().toLowerCase();
    const al=(el.getAttribute('aria-label')||'').toLowerCase();
    if(names.includes(t)||names.includes(al)){const r=el.getBoundingClientRect();
      out.push({label:t||al,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});}
  }
  return out;
});
R.tabs = tabs;

R.stability = [];
R.stability.push({ step:'initial', ...(await page.evaluate(()=>{const e=document.querySelector('.field'); if(!e)return{};const r=e.getBoundingClientRect();return{y:+r.y.toFixed(1),x:+r.x.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};})) });

const order = [...tabs, ...tabs]; // two full cycles
for (const t of order) {
  await page.mouse.click(t.x + t.w/2, t.y + t.h/2);
  await sleep(1400);
  const f = await page.evaluate(()=>{const e=document.querySelector('.field'); if(!e)return{};const r=e.getBoundingClientRect();return{y:+r.y.toFixed(1),x:+r.x.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};});
  R.stability.push({ step:t.label, ...f });
  await page.screenshot({ path: `${SHOT}/tp-tab-${t.label}.png` });
}

// ---- 4. sidebar drawer / rail ----
await page.evaluate(HELPERS);
const sidebarState = () => page.evaluate(() => {
  const q=(s)=>document.querySelector(s);
  const navDiv=[...document.querySelectorAll('div,aside,nav')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&e.className.includes('fixed'));
  const hist=q('#chat-history-nav');
  const box=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
    return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),
      display:cs.display,opacity:cs.opacity,transform:cs.transform,visibility:cs.visibility,cls:(typeof el.className==='string'?el.className:'').slice(0,150)};};
  return { navDiv: box(navDiv), hist: box(hist),
    openBtn: (()=>{const b=[...document.querySelectorAll('button,[role="button"]')].filter(e=>window.__vis(e)).find(e=>/open sidebar|toggle sidebar|menu/i.test((e.getAttribute('aria-label')||'')+' '+e.id));
      return b? Object.assign(window.__desc(b), (()=>{const r=b.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};})()):null;})(),
    closeBtn: (()=>{const b=q('#close-sidebar-button'); if(!b)return null; const r=b.getBoundingClientRect();
      return Object.assign(window.__desc(b),{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),vis:window.__vis(b)});})(),
    allSidebarBtns: [...document.querySelectorAll('button,[role="button"]')].filter(e=>window.__vis(e)&&/sidebar|nav|menu|panel/i.test((e.getAttribute('aria-label')||'')+' '+e.id+' '+(typeof e.className==='string'?e.className:''))).map(e=>{const r=e.getBoundingClientRect();return Object.assign(window.__desc(e),{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});})
  };
});

R.sidebar = { closedInitial: await sidebarState() };

// find + click an open control
const openCtl = R.sidebar.closedInitial.openBtn || R.sidebar.closedInitial.allSidebarBtns.find(b=>/open/i.test(b.label+b.id));
if (openCtl) {
  await page.mouse.click(openCtl.x + openCtl.w/2, openCtl.y + openCtl.h/2);
  await sleep(1600);
  await page.evaluate(HELPERS);
  R.sidebar.opened = await sidebarState();
  R.sidebar.openedMainOffset = await page.evaluate(()=>{const m=document.querySelector('main')||document.querySelector('[role="main"]');
    if(!m)return null;const r=m.getBoundingClientRect();return{x:+r.x.toFixed(1),w:+r.width.toFixed(1),right:+r.right.toFixed(1)};});
  await page.screenshot({ path: `${SHOT}/tp-sidebar-open.png` });

  // now close it
  await page.evaluate(HELPERS);
  const cb = R.sidebar.opened.closeBtn;
  if (cb && cb.vis) {
    await page.mouse.click(cb.x + cb.w/2, cb.y + cb.h/2);
    await sleep(1600);
    await page.evaluate(HELPERS);
    R.sidebar.closedAfterToggle = await sidebarState();
    await page.screenshot({ path: `${SHOT}/tp-sidebar-closed.png` });
  }
} else {
  R.sidebar.openCtlFound = false;
}
R.sidebar.openCtlUsed = openCtl || null;

// re-check overflow after all interaction
R.overflowAfter = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth}));
R.pageErrors = pageErrors;

fs.writeFileSync(`${SHOT}/pass2.json`, JSON.stringify(R, null, 1));
console.log('WROTE pass2.json');
console.log('field:', JSON.stringify(R.field));
console.log('stability:', JSON.stringify(R.stability));
console.log('pageErrors:', R.pageErrors.length);
await browser.close();
