import { chromium } from 'playwright';
const URL = 'http://localhost:5220/c/new';
const W = 390, H = 844;
const SP = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const pageerrors = [];
page.on('pageerror', e => pageerrors.push(String(e && e.message ? e.message : e)));
let ok = false;
for (let a = 0; a < 4 && !ok; a++) { await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); try { await page.waitForSelector('.field', { timeout: 12000 }); ok = true; } catch {} }
await page.waitForTimeout(2000);
const out = { ok, pageerrors };

const MASKS = `(()=>{const res=[];
 for(const el of document.querySelectorAll('button,[role=button],div')){
   const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
   if(r.width>=innerWidth*0.98 && r.height>=innerHeight*0.98 && (el.tagName==='BUTTON'||el.getAttribute('role')==='button')){
     res.push({tag:el.tagName.toLowerCase(), aria:el.getAttribute('aria-label')||'', tid:el.getAttribute('data-testid')||'',
       cls:(el.className||'').toString().slice(0,80), x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
       display:cs.display, pe:cs.pointerEvents, opacity:cs.opacity, vis:cs.visibility, z:cs.zIndex, tabindex:el.tabIndex});
   }}
 return res;})()`;

out.masksAtRest = await page.evaluate(MASKS);
// hit testing: what element is on top at key points?
out.hitTest = await page.evaluate(`(()=>{const pts=[[195,24],[195,420],[195,600],[345,611],[195,702],[195,804]];
 return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y); if(!e)return {x,y,el:null};
  const b=e.closest('button,a'); return {x,y, el:e.tagName.toLowerCase()+'.'+(e.className||'').toString().split(/\\s+/).slice(0,2).join('.'),
   btn: b? (b.getAttribute('aria-label')||b.getAttribute('data-testid')||b.innerText.trim().slice(0,20)) : null};});})()`);

// ---- Now click the starter chip and fully characterise the resulting layout
const before = await page.evaluate(`(()=>{const f=document.querySelector('.field');const r=f.getBoundingClientRect();
 return {url:location.pathname, x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};})()`);
out.before = before;

await page.locator('button:has-text("Summarize")').first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: SP + 'f-after-starter.png' });

out.after = await page.evaluate(`(()=>{const f=document.querySelector('.field'); const r=f.getBoundingClientRect(); const ta=document.querySelector('[data-testid=text-input]');
 const foot=[...document.querySelectorAll('div')].find(d=>/Terms of service/.test(d.innerText||'')&&d.getBoundingClientRect().height<120);
 const fr = foot?foot.getBoundingClientRect():null;
 return {url:location.pathname, taValue: ta?ta.value.slice(0,60):null,
  field:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)},
  footer: fr?{y:+fr.y.toFixed(1),h:+fr.height.toFixed(1),bottom:+fr.bottom.toFixed(1)}:null,
  gapFieldToFooter: fr? +(fr.y - r.bottom).toFixed(1) : null,
  docSW: document.documentElement.scrollWidth, docCW: document.documentElement.clientWidth,
  landingH1: !!document.querySelector('h1')};})()`);

// small tap targets in the after state + at rest
const TAPS = `(()=>{const res=[];
 for(const el of document.querySelectorAll('button,a[href],[role=tab],[role=button],input:not([type=hidden]),textarea,select')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05) continue;
  if(el.closest('.ReactQueryDevtools')||/React Query/i.test(el.getAttribute('aria-label')||'')) continue;
  const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
  if(r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight) continue;   // on-screen only
  if(r.width>=innerWidth*0.98&&r.height>=innerHeight*0.98) continue;          // masks
  if(r.width<44||r.height<44){const tid=el.getAttribute('data-testid');const ar=el.getAttribute('aria-label');
   res.push({sel:el.tagName.toLowerCase()+(tid?'[data-testid="'+tid+'"]':'')+(ar?'[aria-label="'+ar+'"]':''),
    txt:(el.innerText||ar||'').trim().slice(0,30), x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
    fs:parseFloat(cs.fontSize)});}}
 return res;})()`;
out.tapsAfter = await page.evaluate(TAPS);

// overlap among on-screen non-mask controls (after state)
out.overlaps = await page.evaluate(`(()=>{const list=[];
 for(const el of document.querySelectorAll('button,a[href],[role=tab],[role=button]')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05) continue;
  if(el.closest('.ReactQueryDevtools')||/React Query/i.test(el.getAttribute('aria-label')||'')) continue;
  const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
  if(r.right<=0||r.bottom<=0||r.left>=innerWidth||r.top>=innerHeight) continue;
  if(r.width>=innerWidth*0.98&&r.height>=innerHeight*0.98) continue;
  if(el.querySelector('button,a[href]')) continue; // skip wrappers containing other controls
  const tid=el.getAttribute('data-testid');const ar=el.getAttribute('aria-label');
  list.push({sel:el.tagName.toLowerCase()+(tid?'[data-testid="'+tid+'"]':'')+(ar?'[aria-label="'+ar+'"]':''),txt:(el.innerText||ar||'').trim().slice(0,24),r:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}});}
 const hits=[];
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i].r,b=list[j].r;
  const ox=Math.min(a.right,b.right)-Math.max(a.x,b.x), oy=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
  if(ox>0.5&&oy>0.5) hits.push({a:list[i].sel+'|'+list[i].txt,b:list[j].sel+'|'+list[j].txt,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}
 return {count:list.length, hits};})()`);

// go back to rest and repeat taps/overlaps there
await page.goto(URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
await page.waitForSelector('.field', { timeout: 12000 }).catch(()=>{});
out.tapsRest = await page.evaluate(TAPS);
out.overlapsRest = await page.evaluate(`(()=>{const list=[];
 for(const el of document.querySelectorAll('button,a[href],[role=tab],[role=button]')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05) continue;
  if(el.closest('.ReactQueryDevtools')||/React Query/i.test(el.getAttribute('aria-label')||'')) continue;
  const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
  if(r.right<=0||r.bottom<=0||r.left>=innerWidth||r.top>=innerHeight) continue;
  if(r.width>=innerWidth*0.98&&r.height>=innerHeight*0.98) continue;
  if(el.querySelector('button,a[href]')) continue;
  const tid=el.getAttribute('data-testid');const ar=el.getAttribute('aria-label');
  list.push({sel:el.tagName.toLowerCase()+(tid?'[data-testid="'+tid+'"]':'')+(ar?'[aria-label="'+ar+'"]':''),txt:(el.innerText||ar||'').trim().slice(0,24),r:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}});}
 const hits=[];
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i].r,b=list[j].r;
  const ox=Math.min(a.right,b.right)-Math.max(a.x,b.x), oy=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
  if(ox>0.5&&oy>0.5) hits.push({a:list[i].sel+'|'+list[i].txt,b:list[j].sel+'|'+list[j].txt,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}
 return {count:list.length, hits};})()`);
out.masksRest2 = await page.evaluate(MASKS);

console.log(JSON.stringify(out, null, 2));
await browser.close();
