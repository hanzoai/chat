import { chromium } from 'playwright';
const W = 1920, H = 1080;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

const r = await page.evaluate(() => {
  const CTRL = 'button, a, [role="tab"], [role="button"], input, textarea, select, summary';
  const all = [...document.querySelectorAll(CTRL)];
  const step = { total: all.length, sizeOk: 0, cssOk: 0, ancestorOk: 0 };
  const failedAncestor = [];
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    step.sizeOk++;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    step.cssOk++;
    let p = el.parentElement, bad = null;
    while (p) {
      const pc = getComputedStyle(p);
      if (pc.display === 'none' || pc.visibility === 'hidden' || parseFloat(pc.opacity) === 0) { bad = { tag: p.tagName, cls: String(p.className).slice(0,80), display: pc.display, vis: pc.visibility, op: pc.opacity }; break; }
      p = p.parentElement;
    }
    if (bad) { if (failedAncestor.length < 5) failedAncestor.push({ el: el.tagName + ' ' + (el.getAttribute('aria-label')||el.innerText||'').slice(0,30), bad }); continue; }
    step.ancestorOk++;
  }
  return { step, failedAncestor, bodyHTMLlen: document.body.innerHTML.length };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
