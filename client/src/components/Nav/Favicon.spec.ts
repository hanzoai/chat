import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE TAB WEARS THE SAME MARK AS THE REST OF THE FLEET, and it keeps wearing it
 * after the file changes.
 *
 * chat shipped a hollow, black-stroked outline H while hanzo.ai, cloud.hanzo.ai
 * and hanzo.app all served one solid mark. The file was corrected — and the
 * correction did not arrive. An icon goes out `public, max-age=172800`, so it
 * lives two days in every browser that already has one and Cloudflare keeps a
 * copy of its own besides. Measured on production while the pod was already
 * serving the right bytes: `cf-cache-status: HIT`, `age: 63590`, 5236 bytes at
 * the edge against 2142 in the container.
 *
 * A URL nobody has fetched has no cache to beat, so the link carries the mark's
 * own content hash. That only helps while the two agree, which is what this
 * reads: change the icon without changing the query and the fix silently does
 * not ship, exactly as it did not ship before.
 */
const root = join(__dirname, '..', '..', '..');
const hash = (p: string) =>
  createHash('md5').update(readFileSync(join(root, p))).digest('hex').slice(0, 8);

describe('the tab icon', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');

  it('versions every icon link by the file’s own content', () => {
    for (const [file, href] of [
      ['public/favicon.ico', '/favicon.ico'],
      ['public/favicon.svg', '/favicon.svg'],
    ] as const) {
      const declared = new RegExp(`href="${href}\\?v=([0-9a-f]{8})"`).exec(html)?.[1];
      expect({ href, declared }).toEqual({ href, declared: hash(file) });
    }
  });

  it('asks for no icon by a bare path', () => {
    // A bare path is the state that let a corrected mark sit behind a two-day
    // cache. Any icon link without a version is that bug returning.
    const bare = [...html.matchAll(/<link[^>]*rel="icon"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !/\?v=[0-9a-f]{8}/.test(tag));
    expect(bare).toEqual([]);
  });

  it('serves the mark the rest of the fleet serves, not an outline', () => {
    // hanzo.ai, cloud.hanzo.ai and hanzo.app all answer this exact file. The
    // outline was 5236 bytes; the mark is 2142. Pinning the hash is what makes
    // "the same mark" a fact rather than a claim — swap the file for another
    // drawing of an H and this fails.
    expect(hash('public/favicon.ico')).toBe('9ed5d449');
  });
});
