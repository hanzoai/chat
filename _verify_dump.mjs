import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 740 },
  isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,160)); });
page.on('response', r => { if (r.status() === 401) errs.push('401 ' + r.url().replace('http://localhost:5220','')); });

await page.goto('http://localhost:5220/c/new', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const anchors = Array.from(document.querySelectorAll('a')).map(a => {
    const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
    return {
      text: a.textContent.trim().slice(0, 50),
      href: a.getAttribute('href'),
      rect: { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), bottom:+r.bottom.toFixed(1), right:+r.right.toFixed(1) },
      fontSize: cs.fontSize, padding: cs.padding, minHeight: cs.minHeight, display: cs.display,
      parentTag: a.parentElement?.tagName,
      parentCls: (typeof a.parentElement?.className === 'string' ? a.parentElement.className : '').slice(0,100),
    };
  });
  // anything containing 'Privacy' or 'Terms' or 'v0.' anywhere
  const hits = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const t = n.textContent.trim();
    if (/privacy|terms|v0\.|version/i.test(t) && t.length < 80) {
      const el = n.parentElement;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      hits.push({ text: t, tag: el.tagName, cls: (typeof el.className==='string'?el.className:'').slice(0,90),
        rect:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)},
        fontSize: cs.fontSize, padding: cs.padding, minHeight: cs.minHeight });
    }
  }
  return {
    url: location.href,
    title: document.title,
    bodyTextStart: document.body.innerText.slice(0, 600),
    anchorCount: anchors.length,
    anchors,
    privacyTermsHits: hits,
    footerTags: document.querySelectorAll('footer').length,
    scrollH: document.documentElement.scrollHeight,
  };
});
out.consoleErrors = errs.slice(0, 12);
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: '/home/z/work/hanzo/chat-verify/_verify_shot.png' });
await browser.close();
