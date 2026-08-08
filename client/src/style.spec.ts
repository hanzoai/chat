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
      61,
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
    atMost(3, hits(/\bbg-primary\b/g), 'bg-primary fills');
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
    atMost(315, found, 'hardcoded colours');
  });

  /** Nothing in the product shouts. */
  it('never forces ALL-CAPS', () => {
    expect(hits(/\buppercase\b/g)).toEqual([]);
  });

  /**
   * Type comes from ONE ramp. `@hanzo/ui/gui-config` defines six sizes
   * (11/13/14/15/17/21/26) and every `@hanzo/gui` component reads them by
   * token. Tailwind's `text-*` scale is a SEVENTH through fifteenth opinion,
   * in px, that no token can follow — so each utility is a size the ramp
   * cannot move.
   *
   * `text-base` is the sharp end: it is 16px, and 16px is the base
   * gui-config deliberately retired ("$5 collapses onto 15 to retire the 16px
   * base"). Every one of these call sites puts it back.
   *
   * A budget, not a ban: 1235 of them is not a mass edit anyone should make in
   * one commit, and the number falling is the migration.
   */
  it('does not grow the number of Tailwind font sizes fighting the ramp', () => {
    atMost(
      1235,
      hits(/\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g),
      'Tailwind fontSize utilities',
    );
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

/**
 * The composer is ONE surface with ONE boundary.
 *
 * These are laws, not budgets — each names a rule that must exist, because each
 * replaced a second box the eye read as a bug. A count would be the wrong shape:
 * there is no acceptable number of extra rings around the composer.
 */
describe('the composer, one surface', () => {
  const css = read(path.join(CLIENT, 'style.css'));

  /** The declarations of the rule whose selector list ends with `selector`. */
  const block = (selector: string): string => {
    const i = css.indexOf(`${selector} {`);
    if (i < 0) {
      return '';
    }
    const open = css.indexOf('{', i);
    const close = css.indexOf('}', open);
    return css.slice(open + 1, close);
  };

  /**
   * `@hanzo/design` gives every bare control a resting edge. A control that
   * FILLS a rounded shell has no edge of its own — the shell is the boundary —
   * and without this the composer draws an 8px box inside its own 24px curve.
   */
  it('gives a control inside a field no edge of its own', () => {
    const decl = block('.field :is(textarea, input)');
    expect(decl).toMatch(/border:\s*0/);
    expect(decl).toMatch(/border-radius:\s*0/);
  });

  /**
   * The prism IS the composer's edge, so `.field`'s ring does not paint a second
   * one over it. Focusing the composer used to turn the lit sweep into a flat
   * white rectangle.
   */
  it('never rings the composer in white', () => {
    expect(block('.dark .hz-composer .field:has(:is(textarea, input):focus-visible)')).toMatch(
      /outline:\s*none/,
    );
  });

  /**
   * …and killing that ring is only legitimate because something else says where
   * focus is. The prism brightens instead — measured at 3.32:1 against its ground
   * at the dimmest stop, clearing WCAG 1.4.11's 3:1 for a focus indicator.
   */
  it('makes the prism the focus indicator instead', () => {
    expect(block('.hz-composer:focus-within::before')).toMatch(/conic-gradient/);
    expect(block('.hz-composer:focus-within::after')).toMatch(/opacity/);
  });

  /**
   * The OTHER shells keep theirs. `.field` is worn by six popovers and the answer
   * composer, none of which has a prism, so removing the ring wholesale — the
   * tempting one-line version of the fix above — silently strips the focus
   * indicator from every one of them.
   */
  it('leaves the ring on every shell that has no prism', () => {
    expect(block('.dark .field:has(:is(textarea, input):focus-visible)')).toMatch(/outline-color/);
  });

  /**
   * Focus is CSS's job. React held an `isTextAreaFocused` state whose only
   * purpose was to mirror focus back into the DOM for one selector to read.
   *
   * Matches the two ways the attribute would be USED — `data-focused=` in TSX,
   * `[data-focused]` in a selector — rather than the word, so the comment in
   * style.css explaining why it is gone does not trip its own rule.
   */
  it('does not mirror focus into an attribute for CSS to read', () => {
    expect(hits(/data-focused[=\]]/g)).toEqual([]);
  });
});

describe('the material', () => {
  const css = read(path.join(CLIENT, 'style.css'));

  /**
   * The material has ONE home, and it is not this repo: `@hanzo/ui/glass.css`,
   * the sheet hanzo.app and the console paint from. Chat imports it rather than
   * restating it — a restatement would be a second copy of a value with one
   * owner, and it would hold still the day design moved the theme underneath it.
   */
  it('imports the material rather than restating it', () => {
    expect(css).toContain("@import '@hanzo/ui/glass.css';");
    expect(css).not.toMatch(/backdrop-filter:\s*blur\(20px\)/);
    expect(css).not.toMatch(/\.elevation-[123]\s*[,{]/);
  });

  /**
   * And the import has to RESOLVE to something. This is the test that was
   * missing, and its absence shipped: the previous version asserted only that
   * style.css names an import, which stayed true while the installed
   * `@hanzo/ui` slipped to 8.0.42 — a version with no `./glass.css` export at
   * all. Every `data-slot` below still parsed, the build still succeeded, and
   * not one floating surface had any material behind it.
   *
   * An import is a claim about another package. Check the package.
   */
  it('resolves the material to a package that actually ships it', () => {
    const glass = path.join(CLIENT, '../../node_modules/@hanzo/ui/dist/glass.css');
    expect(fs.existsSync(glass)).toBe(true);
    const sheet = fs.readFileSync(glass, 'utf8');
    expect(sheet).toMatch(/backdrop-filter:\s*blur\(20px\)\s*saturate\(1\.8\)/);
    expect(sheet).toMatch(/--edge-highlight/);
  });

  /**
   * What chat DOES own is which of its surfaces are floating chrome. The
   * material attaches by slot, so a Radix content primitive that names no slot
   * is a menu you read the page through — and it fails silently, because
   * nothing in the markup looks wrong.
   */
  /**
   * Four rows used to sit here — `AlertDialog`, `Select` and the legacy
   * `Dialog` — and none of them is a file any more.
   *
   * `AlertDialog` and `Select` had no consumer at all (`Select` was reachable
   * only from `Combobox`, which nothing imported), so the material they named
   * was painted onto surfaces that never rendered. `Dialog` was the older of
   * two Radix dialog stacks; its four call sites moved to `OriginalDialog`,
   * which is the one that computes nested z-index and honours Escape inside a
   * menu. One stack, so one row.
   *
   * A slot on a deleted file is a row that passes forever while proving
   * nothing, which is worse than no row: it reads as coverage. The rule itself
   * is unchanged for every surface that DOES float — add a row back the day a
   * component does.
   */
  it.each([
    ['OriginalDialog', 'dialog-content'],
    ['OriginalDialog', 'dialog-overlay'],
    ['DropdownMenu', 'dropdown-menu-content'],
    ['DropdownMenu', 'dropdown-menu-sub-content'],
  ])('%s names its %s slot', (file, slot) => {
    expect(read(path.join(SHARED, 'components', `${file}.tsx`))).toContain(
      `data-slot="${slot}"`,
    );
  });

  /**
   * The material reaches a surface two ways: a `data-slot` glass.css already
   * styles, or the bare `glass` class for chrome no slot names — HoverCard and
   * Toast take the second route and say so in a comment.
   *
   * These five took NEITHER, and the list they sat on has now run to zero. They
   * are Ariakit and Headless UI popovers, not Radix, so no slot fits and the fix
   * was the `glass` class on all five. It was held back once because they carry
   * 57 call sites between them and a material change wants its own visual pass;
   * that pass measured every one of them open, at 390/834/1444.
   *
   * The blocker named here before the fix was real and had to go first:
   * `.popover-ui` was declared TWICE, in `client/src/style.css` and in
   * `packages/client/src/components/Dropdown.css`, and only the second ever won
   * a cascade. It is now declared once, beside the two components that wear it.
   *
   * A ratchet whose list empties should not be deleted — that just returns the
   * surface to nobody watching it. It inverts: the same five files, asserted to
   * KEEP the material. `glass` is what the browser needs to blur the page behind
   * the menu, and `elevation-2` is the shadow that separates it from the page.
   * A menu that loses either is a menu you read the page through again.
   */
  it.each(['DropdownPopup', 'Dropdown', 'SelectDropDown', 'ControlCombobox', 'InputCombobox'])(
    '%s keeps the glass material — it took a visual pass to earn, do not drop it',
    (file) => {
      const src = read(path.join(SHARED, 'components', `${file}.tsx`));
      expect(src).toMatch(/\bglass\b/);
      expect(src).toMatch(/\belevation-2\b/);
    },
  );

  /**
   * The fallback is the other half of the material. glass.css only paints inside
   * `@supports (backdrop-filter: …)`, so `.popover-ui`'s own opaque fill is what
   * a browser that cannot blur renders — deleting it as "dead" would leave those
   * menus transparent over live text.
   */
  it('keeps an opaque fallback under the glass, in exactly one file', () => {
    const dropdownCss = read(path.join(SHARED, 'components', 'Dropdown.css'));
    expect(dropdownCss).toMatch(/\.popover-ui\s*\{[^}]*background-color:\s*var\(--surface-primary\)/);
    expect(read(path.join(CLIENT, 'style.css'))).not.toMatch(/^\.popover-ui[\s,{]/m);
  });
});
