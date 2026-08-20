import { chromium } from 'playwright';
import fs from 'node:fs';

const SP = '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad';
const URL = 'http://localhost:5220/c/new';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 250)));

async function settle(minMs = 8000, maxMs = 30000) {
  const t0 = Date.now(); let prev = -1, stable = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => document.querySelectorAll('button, a, [role="tab"], [role="button"], input, textarea, select, summary').length);
    if (n === prev && n > 0) stable++; else stable = 0;
    prev = n;
    if (stable >= 3 && Date.now() - t0 >= minMs) break;
  }
  return prev;
}

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await settle();

const SNAP = `
  const SEL='button, a, [role="tab"], [role="button"], input, textarea, select, summary';
  const visible = (el) => { const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) return false;
    let p = el.parentElement;
    while (p) { const pc = getComputedStyle(p);
      if (pc.display==='none'||pc.visibility==='hidden'||parseFloat(pc.opacity)===0) return false; p = p.parentElement; }
    return true; };
  const desc = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), aria: el.getAttribute('aria-label')||'', testid: el.dataset.testid||'',
      cls: (typeof el.className==='string'?el.className:'').slice(0,70),
      text: (el.innerText||'').trim().slice(0,32).replace(/\\n/g,'|'),
      x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), fs: parseFloat(cs.fontSize) }; };
`;

const out = { state: 'default (sidebar expanded), Chat mode' };

out.sidebarOpenWidth = await page.evaluate(() => {
  const n = document.getElementById('chat-history-nav');
  const r = n && n.getBoundingClientRect();
  return r ? { x: +r.x.toFixed(1), w: +r.width.toFixed(1) } : null;
});

out.overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScrollWidth: document.body.scrollWidth };
});

// 5 overlaps
out.overlaps = await page.evaluate(new Function(`${SNAP}
  const els=[...document.querySelectorAll(SEL)].filter(visible); const res=[];
  for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){
    const a=els[i],b=els[j]; if(a.contains(b)||b.contains(a)) continue;
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    const ox=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);
    const oy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
    if(ox>1&&oy>1) res.push({a:desc(a),b:desc(b),overlapW:+ox.toFixed(1),overlapH:+oy.toFixed(1)});
  } return res.slice(0,30);
`));

// 6 offscreen
out.offscreen = await page.evaluate(new Function(`${SNAP}
  const vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
  return [...document.querySelectorAll(SEL)].filter(visible).map(desc)
    .filter(c=>c.x<-0.5||c.y<-0.5||c.right>vw+0.5||c.bottom>vh+0.5);
`));

// 7 tap targets
out.smallTargets = await page.evaluate(new Function(`${SNAP}
  return [...document.querySelectorAll(SEL)].filter(visible).map(desc)
    .filter(c=>c.w<44||c.h<44).sort((a,b)=>(a.w*a.h)-(b.w*b.h));
`));

// 8 fonts + truncation
out.tinyFonts = await page.evaluate(new Function(`${SNAP}
  const res=[],seen=new Set();
  for(const el of document.querySelectorAll('*')){ if(!visible(el)) continue;
    let t=false; for(const n of el.childNodes) if(n.nodeType===3&&n.textContent.trim()) t=true; if(!t) continue;
    const f=parseFloat(getComputedStyle(el).fontSize);
    if(f<11){const k=el.tagName+f+el.textContent.trim().slice(0,15); if(seen.has(k))continue; seen.add(k);
      res.push({...desc(el),fontSize:f,full:el.textContent.trim().slice(0,60)});}}
  return res.slice(0,30);
`));
out.truncated = await page.evaluate(new Function(`${SNAP}
  const res=[];
  for(const el of document.querySelectorAll('*')){ if(!visible(el)) continue;
    let t=false; for(const n of el.childNodes) if(n.nodeType===3&&n.textContent.trim()) t=true; if(!t) continue;
    const cs=getComputedStyle(el);
    const clipped=cs.overflowX==='hidden'||cs.overflow==='hidden'||cs.textOverflow==='ellipsis';
    if(clipped&&el.scrollWidth>el.clientWidth+1)
      res.push({...desc(el),scrollW:el.scrollWidth,clientW:el.clientWidth,ovf:cs.overflow+'/'+cs.overflowX,
        parentCls:(typeof el.parentElement.className==='string'?el.parentElement.className:'').slice(0,70), full:el.textContent.trim().slice(0,60)});}
  return res.slice(0,25);
`));

// composer children vs .field bounds (clipping check)
out.composerInner = await page.evaluate(new Function(`${SNAP}
  const f=document.querySelector('.field'); if(!f) return null;
  const rf=f.getBoundingClientRect(); const cs=getComputedStyle(f);
  const kids=[...f.querySelectorAll(SEL)].filter(visible).map(el=>{
    const d=desc(el); const r=el.getBoundingClientRect();
    d.clippedRight=+(r.right-rf.right).toFixed(1); d.clippedBottom=+(r.bottom-rf.bottom).toFixed(1);
    d.clippedLeft=+(rf.left-r.left).toFixed(1); d.clippedTop=+(rf.top-r.top).toFixed(1);
    return d;});
  return { fieldRect:{x:+rf.x.toFixed(1),y:+rf.y.toFixed(1),w:+rf.width.toFixed(1),h:+rf.height.toFixed(1),
    right:+rf.right.toFixed(1),bottom:+rf.bottom.toFixed(1)}, overflow: cs.overflow,
    fieldScrollW: f.scrollWidth, fieldClientW: f.clientWidth, fieldScrollH: f.scrollHeight, fieldClientH: f.clientHeight,
    kids };
`));

// the oversized iframe: is it clipped by an overflow-hidden ancestor?
out.iframeCheck = await page.evaluate(() => {
  const f = document.querySelector('iframe');
  if (!f) return 'no iframe';
  const r = f.getBoundingClientRect();
  const chain = [];
  let p = f.parentElement;
  for (let i = 0; i < 6 && p; i++) {
    const cs = getComputedStyle(p);
    const pr = p.getBoundingClientRect();
    chain.push({ tag: p.tagName.toLowerCase(), cls: (typeof p.className === 'string' ? p.className : '').slice(0, 70),
      overflow: cs.overflow, x: +pr.x.toFixed(1), w: +pr.width.toFixed(1), right: +pr.right.toFixed(1) });
    p = p.parentElement;
  }
  return { iframe: { x: +r.x.toFixed(1), w: +r.width.toFixed(1), right: +r.right.toFixed(1), src: (f.src || '').slice(0, 80) }, chain };
});

// right control rail spans
out.railSpans = await page.evaluate(() => {
  const nav = document.getElementById('controls-nav');
  if (!nav) return null;
  const nr = nav.getBoundingClientRect();
  const spans = [...nav.querySelectorAll('span')].map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { text: (el.textContent || '').trim().slice(0, 30), x: +r.x.toFixed(1), y: +r.y.toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1),
      scrollW: el.scrollWidth, clientW: el.clientWidth, overflow: cs.overflow, ws: cs.whiteSpace, opacity: cs.opacity };
  }).filter((s) => s.text);
  return { navRect: { x: +nr.x.toFixed(1), w: +nr.width.toFixed(1), right: +nr.right.toFixed(1) }, spans };
});

out.pageErrors = pageErrors;
fs.writeFileSync(SP + '/final.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, smallTargets: out.smallTargets.length + ' items', composerInner: '(json)' }, null, 2));

await page.screenshot({ path: SP + '/f-composer.png', clip: { x: 620, y: 830, width: 900, height: 140 } });
await page.screenshot({ path: SP + '/f-rightrail.png', clip: { x: 1780, y: 0, width: 140, height: 620 } });
await page.screenshot({ path: SP + '/f-footer.png', clip: { x: 400, y: 960, width: 1200, height: 120 } });
await page.screenshot({ path: SP + '/f-topleft.png', clip: { x: 0, y: 0, width: 420, height: 260 } });
await browser.close();
