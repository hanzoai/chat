import fs from 'fs';
import path from 'path';

/**
 * The look, as a ratchet.
 *
 * These are counts, not bans. Every one of them is already above zero, and a ban
 * would have to be either a lie or a mass edit of surfaces nobody is looking at
 * today. A ratchet asks the only question that matters on a shared branch — did
 * this change make it worse? — and it answers in the diff, where the number is
 * the review comment.
 *
 * Lower a budget whenever you clear one. Never raise one: raising it is the edit
 * the ratchet exists to catch, and it costs exactly one line to notice.
 */

const CLIENT = path.resolve(__dirname);
const SHARED = path.resolve(__dirname, '../../packages/client/src');

/** Every source file the two client trees ship, tests excluded. */
const sources = (root: string): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'dist') continue;
        walk(p);
      } else if (/\.(tsx?|css)$/.test(e.name) && !/\.(spec|test)\./.test(e.name)) {
        out.push(p);
      }
    }
  };
  walk(root);
  return out;
};

const ALL = [...sources(CLIENT), ...sources(SHARED)];
const read = (f: string) => fs.readFileSync(f, 'utf8');

/** Files and the lines in them that match, so a failure names its own fix. */
const hits = (re: RegExp): string[] => {
  const found: string[] = [];
  for (const f of ALL) {
    read(f)
      .split('\n')
      .forEach((line, i) => {
        // A rule about what the product PAINTS has nothing to say about prose.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const m of line.matchAll(re)) {
          found.push(`${path.relative(CLIENT, f)}:${i + 1}  ${m[0]}`);
        }
      });
  }
  return found;
};

/** A ratchet reports what it found before it fails, or the number teaches nothing. */
const atMost = (budget: number, found: string[], what: string) => {
  if (found.length > budget) {
    throw new Error(
      `${what}: ${found.length} (budget ${budget}). New ones:\n  ${found.slice(0, 25).join('\n  ')}`,
    );
  }
  expect(found.length).toBeLessThanOrEqual(budget);
};

describe('the look, ratcheted', () => {
  /**
   * A white fill is never a surface or a button. It is allowed as an ACCENT on
   * something small — a checked box, a caret, a progress bar — which is why this
   * counts rather than bans, and why the count is expected to fall as the
   * remaining ones turn out to be surfaces after all.
   */
  it('does not grow the number of white fills', () => {
    atMost(
      72,
      hits(/\b(?:dark:)?bg-white\b(?!\/)|\bbg-\[#(?:f|F)[0-9a-fA-F]{5}\]|\bbg-text-primary\b/g),
      'white fills',
    );
  });

  /**
   * The primary control is the raised pushbutton, spelled `variant="submit"`,
   * `.btn-primary`, or the `--surface-submit` pair. `bg-primary` is design's
   * BRAND colour — near-white in both themes — and using it as a fill is how
   * every dialog ended up asking its one question from a white slab.
   */
  it('does not grow the number of controls filled with the brand colour', () => {
    atMost(7, hits(/\bbg-primary\b/g), 'bg-primary fills');
  });

  /**
   * Hardcoded colour, meaning a hex whose channels are not within 12 of each
   * other. Monochrome hexes are merely unnecessary; a coloured one is a decision
   * the token layer cannot follow into the other theme.
   *
   * The composer's prism is declared in `style.css` as `--hz-spectrum` and is
   * the one deliberate exception — it is a token, so it is not a literal here.
   */
  it('does not grow the number of hardcoded colours', () => {
    const found = hits(/#[0-9a-fA-F]{6}\b/g).filter((h) => {
      const hex = h.slice(-6);
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return Math.max(r, g, b) - Math.min(r, g, b) > 12;
    });
    atMost(326, found, 'hardcoded colours');
  });

  /** Nothing in the product shouts. */
  it('never forces ALL-CAPS', () => {
    expect(hits(/\buppercase\b/g)).toEqual([]);
  });

  /**
   * The composer ring is the ONE prism, and it is the ONE conic gradient. A
   * second one anywhere means a second exemption was granted.
   */
  it('keeps the prism to the composer', () => {
    // The prism IS `--hz-spectrum`; a conic gradient of greys (the file-preview
    // checkerboard) is geometry, not colour, so the rule names the spectrum
    // rather than the shape.
    const prism = hits(/--hz-spectrum/g);
    expect(prism.every((h) => h.startsWith('style.css:'))).toBe(true);
    expect(prism.length).toBeGreaterThan(0);
  });
});

describe('the material', () => {
  const css = read(path.join(CLIENT, 'style.css'));

  /**
   * The material has ONE home, and it is not this repo. `@hanzo/ui/theme.css`
   * inlines `@hanzo/ui/glass.css` — the sheet hanzo.app and the console paint
   * from — so chat imports it rather than restating it. A restatement here
   * would be a second copy of a value with one owner, and it would hold still
   * the day design moved the theme underneath it.
   */
  it('imports the material rather than restating it', () => {
    expect(css).toContain("@import '@hanzo/ui/theme.css';");
    expect(css).not.toMatch(/backdrop-filter:\s*blur\(20px\)/);
    expect(css).not.toMatch(/\.elevation-[123]\s*[,{]/);
  });

  /**
   * What chat DOES own is which of its surfaces are floating chrome. The
   * material attaches by slot, so a Radix content primitive that names no slot
   * is a menu you read the page through — and it fails silently, because
   * nothing in the markup looks wrong.
   */
  it.each([
    ['OriginalDialog', 'dialog-content'],
    ['OriginalDialog', 'dialog-overlay'],
    ['Dialog', 'dialog-content'],
    ['Dialog', 'dialog-overlay'],
    ['AlertDialog', 'dialog-content'],
    ['AlertDialog', 'dialog-overlay'],
    ['Select', 'select-content'],
    ['DropdownMenu', 'dropdown-menu-content'],
    ['DropdownMenu', 'dropdown-menu-sub-content'],
  ])('%s names its %s slot', (file, slot) => {
    expect(read(path.join(SHARED, 'components', `${file}.tsx`))).toContain(
      `data-slot="${slot}"`,
    );
  });
});
