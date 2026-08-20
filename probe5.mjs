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
for (let a = 0; a < 4 && !ok; a++) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  try { await page.waitForSelector('.field', { timeout: 12000 }); ok = true; } catch {}
}
await page.waitForTimeout(2000);
const out = { ok, pageerrors };

const FIELD = `(()=>{const f=document.querySelector('.field'); if(!f) return null; const r=f.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};})()`;
const SW = `({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})`;

out.stability = [];
const rec = async (label) => out.stability.push({ label, field: await page.evaluate(FIELD), doc: await page.evaluate(SW) });

await rec('rest');

// drawer open/close
await page.locator('[data-testid=mobile-menu-button]').click(); await page.waitForTimeout(1100);
await rec('drawer-open');
out.drawerOpenOverflow = await page.evaluate(SW);
await page.locator('[data-testid=close-sidebar-button]').first().click().catch(()=>{}); await page.waitForTimeout(1100);
await rec('drawer-closed');

// focus textarea (simulates keyboard-open focus path)
await page.locator('[data-testid=text-input]').click(); await page.waitForTimeout(700);
await rec('textarea-focused');

// type a long multi-line message -> composer grows
await page.locator('[data-testid=text-input]').fill('The quick brown fox jumps over the lazy dog. '.repeat(12));
await page.waitForTimeout(900);
await rec('long-text');
out.longTextDoc = await page.evaluate(SW);
out.longTextOverflowers = await page.evaluate(`(()=>{const vw=innerWidth,res=[];
  for(const el of document.querySelectorAll('*')){const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')continue;const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1)continue;
    if(el.closest('.ReactQueryDevtools'))continue;
    if(r.right>vw+0.5&&r.left>=-0.5){const t=el.tagName.toLowerCase();const tid=el.getAttribute('data-testid');const c=(el.className||'').toString().split(/\\s+/).slice(0,3).join('.');
      res.push({sel:t+(tid?'[data-testid='+tid+']':'')+(c?'.'+c:''),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),right:+r.right.toFixed(1)});}}
  return res.slice(0,15);})()`);
await page.screenshot({ path: SP + 'f-longtext.png' });

await page.locator('[data-testid=text-input]').fill('');
await page.waitForTimeout(700);
await rec('cleared');

// Summarize starter chip
try { await page.locator('button:has-text("Summarize")').first().click({ timeout: 3000 }); await page.waitForTimeout(1200); await rec('after-summarize'); } catch(e){ out.summarizeErr = String(e).slice(0,120); }

// ---- closed-drawer focusability: does Tab reach off-screen controls?
await page.evaluate(`document.activeElement && document.activeElement.blur()`);
await page.evaluate(`window.scrollTo(0,0)`);
const tabWalk = [];
for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(`(()=>{const a=document.activeElement; if(!a||a===document.body)return null;
    const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
    return {tag:a.tagName.toLowerCase(), tid:a.getAttribute('data-testid')||'', aria:a.getAttribute('aria-label')||'',
      txt:(a.innerText||'').trim().slice(0,24), x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), right:+r.right.toFixed(1),
      inNav: !!a.closest('[data-testid=nav]'), vis: cs.visibility, dev: !!a.closest('.ReactQueryDevtools')};})()`);
  if (info) tabWalk.push(info);
}
out.tabWalk = tabWalk;

// inert / aria-hidden on closed nav?
out.navAttrs = await page.evaluate(`(()=>{const n=document.querySelector('[data-testid=nav]'); if(!n)return null;
  return {inert: n.hasAttribute('inert'), ariaHidden: n.getAttribute('aria-hidden'), cls:(n.className||'').toString(),
    vis: getComputedStyle(n).visibility, transform: getComputedStyle(n).transform,
    focusables: n.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])').length};})()`);

// devtools provenance check
out.devtoolsPresent = await page.evaluate(`!!document.querySelector('.ReactQueryDevtools, [aria-label*="React Query"]')`);

console.log(JSON.stringify(out, null, 2));
await browser.close();
