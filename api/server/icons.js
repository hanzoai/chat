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

/**
 * This brand's name and marks in the PWA install manifest.
 *
 * `manifest.webmanifest` is generated at BUILD time, so lux.chat offered "add to
 * home screen" as an app called Hanzo Chat wearing Hanzo's icons — measured on
 * production, both fields. It is the same defect as the shell's `<title>` and
 * its icon links, one file over, and it outlives the tab by the widest margin of
 * any of them: an installed app keeps the name and the icon it was installed
 * with, on a home screen, until someone deletes it.
 *
 * The name is APP_TITLE, the same value the shell's title already uses, so the
 * tab and the installed app cannot disagree. Icons follow `injectIcons`' rule
 * exactly: the brand's copy of the same basename, or the entry is DROPPED rather
 * than left pointing at another brand's art.
 *
 * Returns the input UNCHANGED when this deployment brands neither — so
 * hanzo.chat keeps the built manifest byte-for-byte rather than a re-serialised
 * copy of it.
 *
 * @param {string} json The built `manifest.webmanifest`.
 * @param {string} dist Absolute path to the built client.
 * @param {string} [org] The org this deployment serves (`OPENID_ORG`).
 * @param {string} [title] This deployment's name (`APP_TITLE`).
 * @returns {string} The manifest, as this brand.
 */
function injectManifest(json, dist, org, title) {
  let manifest;
  try {
    manifest = JSON.parse(json);
  } catch {
    /* Not a manifest we wrote; not ours to repair. */
    return json;
  }
  const dir = org && path.join(dist, BRAND, org);
  const branded = Boolean(dir && fs.existsSync(dir));
  const renames = Boolean(title && title !== manifest.name);
  if (!branded && !renames) {
    return json;
  }
  if (renames) {
    manifest.name = title;
    manifest.short_name = title;
  }
  if (branded && Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons
      .filter((icon) => icon.src && fs.existsSync(path.join(dir, path.basename(icon.src))))
      .map((icon) => ({ ...icon, src: `/${BRAND}/${org}/${path.basename(icon.src)}` }));
  }
  return JSON.stringify(manifest);
}

/**
 * Serve the branded manifest ahead of the built one.
 *
 * Read once at boot, like the shell: the two facts it composes — APP_TITLE and
 * the brand's directory — are fixed for the life of the process. `no-store`
 * matches what `staticCache` already gives a `.webmanifest`, so an installed app
 * still picks up a change on its next visit.
 *
 * @param {import('express').Application} app
 * @param {string} dist Absolute path to the built client.
 * @param {string} [org] The org this deployment serves (`OPENID_ORG`).
 * @param {string} [title] This deployment's name (`APP_TITLE`).
 */
function mountManifest(app, dist, org, title) {
  const file = path.join(dist, 'manifest.webmanifest');
  if (!fs.existsSync(file)) {
    return;
  }
  const body = injectManifest(fs.readFileSync(file, 'utf8'), dist, org, title);
  app.get('/manifest.webmanifest', (_req, res) =>
    res.type('application/manifest+json').set('Cache-Control', 'no-store').send(body),
  );
}

module.exports = { injectIcons, mountIcons, injectManifest, mountManifest, BRAND, ROOTED };
