/**
 * The brand's marks, resolved at RUNTIME and written into the HTML shell.
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

/** Where a brand keeps its marks, relative to the built client. */
const BRAND = 'assets/brand';

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

module.exports = { injectIcons, BRAND };
