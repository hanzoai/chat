/**
 * The brand's marks, resolved at RUNTIME.
 *
 * Two surfaces, one rule. `injectIcons` points the SHELL's links at this
 * brand's marks; `mountIcons` answers the paths that are fetched without the
 * shell's say-so. Both read the same directory and both refuse the same way, so
 * there is one answer to "which mark is this?" and no way for the link and the
 * bytes behind it to disagree.
 *
 * `client/index.html` links the icons that were in the tree when the image was
 * built, and one image serves every brand — so lux.chat wore Hanzo's mark in the
 * tab, in the bookmark bar, in the history list and in every link anyone had
 * already shared. A favicon is the one piece of branding that is visible BEFORE
 * any script runs and that outlives the tab, so the SPA cannot own it; it is the
 * same argument as the `<title>` beside it in `index.js`.
 *
 * A brand's marks are the files it SHIPS, under `assets/brand/<org>`. Nothing is
 * derived from a naming convention beyond the file's own name, so adding a brand
 * is adding a directory.
 *
 * A link whose file the brand does not ship is REMOVED, which is the only one of
 * the three options that is honest. Left alone it serves the OTHER brand's logo —
 * the whole defect — and that is what a `type="image/svg+xml"` link would do
 * here, because Chrome prefers the SVG and Lux's canonical mark set is raster.
 * Repointed it would 404, and a browser that cannot load the icon it was told to
 * prefer shows the globe rather than trying the next one. Removed, the sizes the
 * brand DOES ship are the only ones offered and the browser picks among those.
 */

const fs = require('fs');
const path = require('path');
const staticCache = require('./utils/staticCache');

/** Where a brand keeps its marks, relative to the built client. */
const BRAND = 'assets/brand';

/**
 * The mark paths no rewrite can reach.
 *
 * `/favicon.ico` is fetched at the document ROOT by convention, whatever the
 * shell links say — for a bookmark, a history entry, a restored tab, a cold
 * start. `/assets/logo.svg` is rendered by the BUNDLE, on the sign-in screen,
 * and is still held by anything that cached a reference to it. Both were
 * answered by the built client, so lux.chat served Hanzo's mark at both however
 * carefully the shell above was rewritten — the links were right and the bytes
 * were Hanzo's.
 */
const ROOTED = ['/favicon.ico', '/assets/logo.svg'];

/** Every icon link in the shell, including the newline it sits on. */
const LINK = /[ \t]*<link[^>]*\brel="(?:icon|apple-touch-icon)"[^>]*>\n?/g;

/**
 * Point the shell's icon links at `org`'s marks, dropping the ones it lacks.
 *
 * A deployment that names no org, or whose org ships no marks, keeps the built
 * shell byte-for-byte — which is why hanzo.chat needs no directory of its own.
 *
 * @param {string} html The built `index.html`.
 * @param {string} dist Absolute path to the built client.
 * @param {string} [org] The org this deployment serves (`OPENID_ORG`).
 * @returns {string} The shell, with this brand's marks.
 */
function injectIcons(html, dist, org) {
  if (!org) {
    return html;
  }
  const dir = path.join(dist, BRAND, org);
  if (!fs.existsSync(dir)) {
    return html;
  }
  return html.replace(LINK, (link) => {
    const href = /href="([^"]+)"/.exec(link);
    if (!href) {
      return link;
    }
    /* The basename is the whole of the mapping: a brand ships `favicon-32x32.png`
       under its own directory or it does not ship one at all. */
    const file = path.basename(href[1]);
    if (!fs.existsSync(path.join(dir, file))) {
      return '';
    }
    return link.replace(href[0], `href="/${BRAND}/${org}/${file}"`);
  });
}

/**
 * Answer the rooted mark paths from `org`'s directory, ahead of the built client.
 *
 * The SAME rule as `injectIcons`, at the other end of the same wire: a mark the
 * brand ships is served, and one it does not ship is 404 — never the other
 * brand's file, which is the whole defect. Removing a link from the shell and
 * then serving that very file to anyone who asks for it directly would be two
 * policies answering one question, and the honest one would be the weaker of
 * the two.
 *
 * A brand with no directory is not intercepted at all, so a deployment that
 * names no org — or names `hanzo`, which ships no directory — keeps the built
 * client byte-for-byte.
 *
 * Serving goes through the same `staticCache` the built client uses rather than
 * a hand-rolled `sendFile`, so a brand's favicon gets exactly the caching,
 * ETag and range behaviour Hanzo's already had. The rewrite to a bare basename
 * is safe because this handler is terminal: it answers or it 404s, and nothing
 * downstream ever sees the shortened url.
 *
 * @param {import('express').Application} app
 * @param {string} dist Absolute path to the built client.
 * @param {string} [org] The org this deployment serves (`OPENID_ORG`).
 */
function mountIcons(app, dist, org) {
  const dir = org && path.join(dist, BRAND, org);
  if (!dir || !fs.existsSync(dir)) {
    return;
  }
  const marks = staticCache(dir, { skipGzipScan: true });
  app.get(ROOTED, (req, res, next) => {
    req.url = `/${path.basename(req.path)}`;
    marks(req, res, () => res.sendStatus(404));
  });
}

module.exports = { injectIcons, mountIcons, BRAND, ROOTED };
