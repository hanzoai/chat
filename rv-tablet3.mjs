import { chromium } from 'playwright';
import fs from 'fs';
const SHOT='/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const URL='http://localhost:5220/c/new';

const browser=await chromium.launch();
const R={};

async function probe(W,H,tag){
  const ctx=await browser.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await sleep(8000);
  try{await page.waitForSelector('.field',{timeout:15000,state:'attached'});}catch{}
  await sleep(2000);

  const res = await page.evaluate((VW)=>{
    const vis=(el)=>{const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;
      let p=el.parentElement;while(p){const c=getComputedStyle(p);
        if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;p=p.parentElement;}
      const r=el.getBoundingClientRect();return r.width>=1&&r.height>=1;};
    const bx=(el)=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
      return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),
        display:cs.display,opacity:cs.opacity,transform:cs.transform,visible:vis(el),
        cls:(typeof el.className==='string'?el.className:'').slice(0,170)};};
    // every element whose aria-label/id/class mentions sidebar or nav toggle
    const cands=[...document.querySelectorAll('button,[role="button"],a,div')].filter(el=>{
      const s=((el.getAttribute('aria-label')||'')+' '+el.id+' '+(typeof el.className==='string'?el.className:'')).toLowerCase();
      return /sidebar|hamburger|open-nav|nav-toggle|toggle-nav|menu-button/.test(s);
    }).map(el=>Object.assign({label:el.getAttribute('aria-label')||'',id:el.id,tag:el.tagName.toLowerCase()},bx(el)));

    const navDiv=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&e.className.includes('fixed'));
    // header contents
    const hdr=document.querySelector('header')||document.querySelector('[class*="header"]');
    const hdrKids=hdr?[...hdr.querySelectorAll('button,[role="button"],a')].map(el=>Object.assign({label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40),id:el.id,tag:el.tagName.toLowerCase()},bx(el))):null;
    // absolutely everything visible in the top-left 200x80 corner
    const corner=[...document.querySelectorAll('*')].filter(el=>{if(!vis(el))return false;
      const r=el.getBoundingClientRect();return r.x<200&&r.y<90&&r.width>=8&&r.height>=8;})
      .map(el=>Object.assign({label:(el.getAttribute('aria-label')||'').slice(0,40),id:el.id,tag:el.tagName.toLowerCase()},bx(el)));

    return { cands, navDiv: navDiv?bx(navDiv):null, hdrCls: hdr?(typeof hdr.className==='string'?hdr.className:'').slice(0,180):null,
      hdrBox: hdr?bx(hdr):null, hdrKids, corner: corner.slice(0,25),
      docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth,
      field: (()=>{const e=document.querySelector('.field'); if(!e)return null; const r=e.getBoundingClientRect();
        return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};})(),
      localStorageNav: (()=>{try{const o={};for(const k of Object.keys(localStorage)) if(/nav|sidebar/i.test(k)) o[k]=localStorage.getItem(k); return o;}catch(e){return String(e);}})()
    };
  }, W);
  res.pageErrors=errs;
  await page.screenshot({path:`${SHOT}/probe-${tag}.png`});

  // Try: can we open the drawer at all? force localStorage navVisible=true and reload
  await page.evaluate(()=>{ try{ localStorage.setItem('navVisible','true'); }catch(e){} });
  await page.reload({waitUntil:'domcontentloaded'});
  await sleep(9000);
  res.afterForceOpen = await page.evaluate(()=>{
    const navDiv=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&e.className.includes('fixed'));
    const bx=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
      return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),opacity:cs.opacity,transform:cs.transform,cls:(typeof el.className==='string'?el.className:'').slice(0,170)};};
    const main=document.querySelector('main');
    return { navDiv: bx(navDiv), main: bx(main),
      closeBtn: (()=>{const b=document.querySelector('#close-sidebar-button'); if(!b)return null; const r=b.getBoundingClientRect();
        const cs=getComputedStyle(b); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),opacity:cs.opacity};})(),
      docScrollW: document.documentElement.scrollWidth };
  });
  await page.screenshot({path:`${SHOT}/probe-${tag}-forceopen.png`});

  // then click close and measure the collapsed state == railWidth
  const cb=res.afterForceOpen.closeBtn;
  if(cb && cb.x>=0){
    await page.mouse.click(cb.x+cb.w/2, cb.y+cb.h/2);
    await sleep(1800);
    res.afterClose = await page.evaluate(()=>{
      const navDiv=[...document.querySelectorAll('div')].find(e=>typeof e.className==='string'&&/(^|\s)nav(\s|$)/.test(e.className)&&e.className.includes('fixed'));
      const bx=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
        return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),opacity:cs.opacity,transform:cs.transform};};
      // any visible rail on the left edge?
      const vis=(el)=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;
        let p=el.parentElement;while(p){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;p=p.parentElement;}
        const r=el.getBoundingClientRect();return r.width>=1&&r.height>=1;};
      const leftEdge=[...document.querySelectorAll('*')].filter(el=>{if(!vis(el))return false;const r=el.getBoundingClientRect();
        return r.x<=2 && r.width>0 && r.width<=90 && r.height>200;}).map(el=>{const r=el.getBoundingClientRect();
        return {tag:el.tagName.toLowerCase(),cls:(typeof el.className==='string'?el.className:'').slice(0,90),x:+r.x.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
      const openBtn=[...document.querySelectorAll('button,[role="button"]')].filter(vis).filter(e=>/open sidebar|sidebar/i.test((e.getAttribute('aria-label')||'')+e.id)).map(e=>{const r=e.getBoundingClientRect();
        return {label:e.getAttribute('aria-label'),id:e.id,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
      return { navDiv: bx(navDiv), leftEdge, openBtnAfterClose: openBtn };
    });
    await page.screenshot({path:`${SHOT}/probe-${tag}-afterclose.png`});
  }
  await ctx.close();
  return res;
}

R['768'] = await probe(768,1024,'768');
R['767'] = await probe(767,1024,'767');
R['1024'] = await probe(1024,1024,'1024w');

fs.writeFileSync(`${SHOT}/pass3.json`, JSON.stringify(R,null,1));
console.log('done');
await browser.close();
