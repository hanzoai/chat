import { chromium } from 'playwright';
import fs from 'fs';
const SHOT='/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const URL='http://localhost:5220/c/new';
const browser=await chromium.launch();
const R={};
for (const W of [767,768,769,820,900,1023,1024]) {
  const ctx=await browser.newContext({viewport:{width:W,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await ctx.newPage();
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await sleep(8000);
  try{await page.waitForSelector('.field',{timeout:12000,state:'attached'});}catch{}
  await sleep(1500);
  R[W]=await page.evaluate(()=>{
    const vis=(el)=>{const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;
      let p=el.parentElement;while(p){const c=getComputedStyle(p);
        if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;p=p.parentElement;}
      const r=el.getBoundingClientRect();return r.width>=1&&r.height>=1;};
    const all=[...document.querySelectorAll('button,a[href],[role="button"]')];
    const auth=all.filter(e=>/^(log ?in|sign ?up|sign ?in|register)$/i.test((e.textContent||'').trim())).map(e=>{
      const r=e.getBoundingClientRect();return {t:(e.textContent||'').trim(),vis:vis(e),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
    const openSide=all.filter(e=>/open sidebar/i.test(e.getAttribute('aria-label')||'')).map(e=>{
      const r=e.getBoundingClientRect();return {id:e.id,vis:vis(e),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
    const mobHdr=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&e.className.includes('md:hidden')&&e.className.includes('sticky top-0'));
    const mh=mobHdr?(()=>{const r=mobHdr.getBoundingClientRect();return{vis:vis(mobHdr),display:getComputedStyle(mobHdr).display,w:+r.width.toFixed(1),h:+r.height.toFixed(1)};})():null;
    const navFixed=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&e.className.includes('fixed'));
    const navRail=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&!e.className.includes('fixed'));
    const bx=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
      return{x:+r.x.toFixed(1),w:+r.width.toFixed(1),opacity:cs.opacity,transform:cs.transform,cls:(typeof el.className==='string'?el.className:'').slice(0,80)};};
    // composer icon button size
    const af=document.querySelector('#attach-file-menu-button');
    const afb=af?(()=>{const r=af.getBoundingClientRect();return{w:+r.width.toFixed(1),h:+r.height.toFixed(1)};})():null;
    return { mode: navFixed?'drawer':(navRail?'rail':'none'), navFixed:bx(navFixed), navRail:bx(navRail),
      mobileHeader: mh, auth, openSide, attachBtn: afb,
      scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth };
  });
  if(W===768||W===769||W===820) await page.screenshot({path:`${SHOT}/w-${W}.png`});
  await ctx.close();
  console.log(W, JSON.stringify(R[W]));
}
fs.writeFileSync(`${SHOT}/pass4.json`,JSON.stringify(R,null,1));
await browser.close();
