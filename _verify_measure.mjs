import { chromium } from 'playwright';

const VW = 360, VH = 740;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: VW, height: VH },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const texts = ['Privacy policy', 'Terms of service', 'Hanzo Chat'];
  const res = { viewport: { w: innerWidth, h: innerHeight }, nodes: [] };

  // find every element whose trimmed text matches one of the targets exactly-ish
  const all = Array.from(document.querySelectorAll('*'));
  const matches = all.filter(el => {
    const t = (el.textContent || '').trim();
    return texts.some(x => t === x || t.startsWith('Hanzo Chat v'));
  });

  // keep the deepest ones (the actual leaf carrying the text)
  const leaves = matches.filter(el => !matches.some(o => o !== el && el.contains(o)));

  for (const el of leaves) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);

    // walk up to find the nearest ancestor that is actually the interactive/hit element
    let hit = el;
    while (hit && !['A','BUTTON'].includes(hit.tagName) && !hit.getAttribute?.('role')?.match(/link|button/) && hit !== document.body) {
      hit = hit.parentElement;
    }
    const hr = hit && hit !== document.body ? hit.getBoundingClientRect() : null;
    const hcs = hit && hit !== document.body ? getComputedStyle(hit) : null;

    // ancestor chain for context
    const chain = [];
    let p = el;
    for (let i = 0; i < 6 && p; i++) {
      const pr = p.getBoundingClientRect();
      chain.push({
        tag: p.tagName,
        cls: (p.className && typeof p.className === 'string') ? p.className.slice(0, 110) : '',
        rect: { x: +pr.x.toFixed(1), y: +pr.y.toFixed(1), w: +pr.width.toFixed(1), h: +pr.height.toFixed(1) },
        display: getComputedStyle(p).display,
        pad: getComputedStyle(p).padding,
        minH: getComputedStyle(p).minHeight,
      });
      p = p.parentElement;
    }

    res.nodes.push({
      text: (el.textContent || '').trim(),
      tag: el.tagName,
      href: el.getAttribute?.('href') ?? null,
      role: el.getAttribute?.('role') ?? null,
      isInteractive: ['A','BUTTON'].includes(el.tagName) || !!el.onclick,
      rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) },
      fontSize: cs.fontSize,
      padding: cs.padding,
      minHeight: cs.minHeight,
      display: cs.display,
      lineHeight: cs.lineHeight,
      hitEl: hr ? { tag: hit.tagName, rect: { x:+hr.x.toFixed(1), y:+hr.y.toFixed(1), w:+hr.width.toFixed(1), h:+hr.height.toFixed(1) }, pad: hcs.padding, minH: hcs.minHeight } : null,
      chain,
    });
  }

  // Also: what does elementFromPoint say at the centre of each? (real hit-testing)
  res.hitTest = res.nodes.map(n => {
    const cx = n.rect.x + n.rect.w / 2, cy = n.rect.y + n.rect.h / 2;
    const top = document.elementFromPoint(cx, cy);
    return { text: n.text, at: [cx, cy], topTag: top?.tagName, topText: (top?.textContent || '').trim().slice(0, 40) };
  });

  res.footerCount = document.querySelectorAll('footer').length;
  res.footerAnchors = Array.from(document.querySelectorAll('footer a')).map(a => {
    const r = a.getBoundingClientRect();
    return { text: a.textContent.trim(), h: +r.height.toFixed(1), w: +r.width.toFixed(1), y: +r.y.toFixed(1) };
  });
  res.url = location.href;
  res.hasAuthCookie = document.cookie.length > 0;
  return res;
});

console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: '/dev/shm/gotmp/claude-1000/-home-z/e4873e90-d750-416c-a52d-c358c5c52973/scratchpad/shot.png', fullPage: false });
await browser.close();
