/**
 * The shell's social card, resolved at RUNTIME.
 *
 * A link to this app unfurled bare: the shell carried no `og:` or `twitter:`
 * tags at all, so a share in Slack, iMessage or anywhere else showed a URL and
 * nothing more. The card cannot be built into the file for the same reason the
 * `<title>` beside it in `index.js` cannot — one image serves every brand, so a
 * card baked at build time would announce Hanzo Chat from lux.chat, in someone
 * else's timeline, permanently.
 *
 * It also cannot come from the SPA. A crawler reads the document it is served
 * and runs no script, so a card written after React boots is a card nobody
 * fetching the link will ever see.
 *
 * So it is composed here, from what the shell already says:
 *
 *   name   APP_TITLE, the same value the title and the manifest use
 *   text   the shell's own `<meta name="description">`
 *   image  the apple-touch mark ALREADY rewritten by `injectIcons`
 *
 * Nothing is restated and nothing is invented. Reading the mark out of the
 * rewritten html rather than resolving it again is the point: `injectIcons`
 * owns the question "which mark is this brand's", and a second answer here is
 * how the tab and the link unfurl end up wearing different logos.
 *
 * `summary`, not `summary_large_image`: a large card wants a 1200x630 banner
 * and this app ships a square mark. Claiming the wide format without the art
 * gets the image cropped or dropped, which is worse than the small card that
 * is actually true.
 */

/** The description the shell already carries, which the card restates. */
const TEXT = /<meta\s+name="description"\s+content="([^"]*)"/i;

/** The brand's touch mark, as `injectIcons` left it. */
const MARK = /<link[^>]*\brel="apple-touch-icon"[^>]*\bhref="([^"]+)"/i;

/** Where the card is inserted. */
const HEAD = '</head>';

const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * Give the shell a social card naming THIS deployment.
 *
 * A deployment that names no title keeps the shell byte-for-byte: a card whose
 * every field is a guess is not better than no card.
 *
 * @param {string} html The built `index.html`, AFTER `injectIcons`.
 * @param {string} [title] This deployment's name (`APP_TITLE`).
 * @param {string} [url] This deployment's public origin (`DOMAIN_CLIENT`).
 * @returns {string} The shell, with this brand's card.
 */
function injectCard(html, title, url) {
  if (!title || !html.includes(HEAD)) {
    return html;
  }

  const text = TEXT.exec(html)?.[1] ?? '';
  const mark = MARK.exec(html)?.[1];

  /* Absolute, because a card is read somewhere else entirely — a relative image
     resolves against the crawler's own host, or against nothing at all. Without
     a public origin to resolve against there is no image rather than a broken
     one. */
  let image;
  if (mark && url) {
    try {
      image = new URL(mark, url).href;
    } catch {
      image = undefined;
    }
  }

  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', title],
    ['property', 'og:title', title],
    text && ['property', 'og:description', text],
    url && ['property', 'og:url', url],
    image && ['property', 'og:image', image],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', title],
    text && ['name', 'twitter:description', text],
    image && ['name', 'twitter:image', image],
  ]
    .filter(Boolean)
    .map(([attr, key, value]) => `    <meta ${attr}="${key}" content="${escape(value)}" />`)
    .join('\n');

  return html.replace(HEAD, `${tags}\n  ${HEAD}`);
}

module.exports = { injectCard };
