import { readFileSync } from 'fs';
import { join } from 'path';
import { DOCK_CARDS, originOf } from './cards';

/**
 * A dock card is an iframe, so its origin has to be in the server's
 * `frame-src`. When it is not, the browser blocks the frame and the card
 * renders as an EMPTY BOX — no error card, nothing in the UI that says why.
 * That silence is the whole reason for this test: the failure is invisible
 * exactly where someone would look for it.
 *
 * It reads the real policy file rather than a copy, so the two cannot drift.
 */
describe('dock cards', () => {
  const csp = readFileSync(join(__dirname, '../../../../../api/server/csp.js'), 'utf8');
  const frameSrc = csp.split('\n').find((l) => l.includes('"frame-src')) ?? '';

  it('reads the real policy', () => {
    expect(frameSrc).toContain('frame-src');
  });

  it.each(DOCK_CARDS.map((c) => [c.id, c.src]))(
    'card %s names an origin frame-src allows',
    (id, src) => {
      const origin = originOf(src as string);
      expect(frameSrc).toContain(origin);
    },
  );

  it('is proven to catch a missing origin', () => {
    // Negative control: an origin nobody allowed must NOT be found. Without
    // this, a frameSrc that failed to load (empty string) would make every
    // assertion above pass vacuously — `''.toContain` never runs, but a
    // `.includes` against a truthy-but-wrong line would.
    expect(frameSrc).not.toContain('https://widgets.example.invalid');
  });

  it.each(DOCK_CARDS.map((c) => [c.id, c.src]))(
    'card %s is cross-origin, so its allow-same-origin sandbox cannot reach this page',
    (id, src) => {
      // The cards render with sandbox="allow-scripts allow-same-origin". That
      // pair is only safe because every card is a THIRD-PARTY origin: a
      // same-origin frame with both flags can reach into its parent and strip
      // its own sandbox (same-origin XSS). frame-src includes 'self', so the
      // origin-in-frame-src test above would let a same-origin card through —
      // this is the invariant that actually keeps the sandbox sound, made
      // structural instead of left to a comment.
      expect(originOf(src as string)).not.toBe('https://hanzo.chat');
      expect((src as string).startsWith('/')).toBe(false);
    },
  );

  it('gives every card a stable id and a note', () => {
    const ids = DOCK_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    DOCK_CARDS.forEach((c) => {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(0);
    });
  });
});
