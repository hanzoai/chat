import { readFileSync } from 'fs';
import { join } from 'path';
import { CONTROL, CONTROL_OPEN, ROW } from './chrome';

/**
 * The top row is one row, so it wears one box.
 *
 * Every control in it used to hand-roll its own, and the row showed it — 44s
 * beside a 40, four opaque plates beside three transparent glyphs, one 999px
 * circle among 12px squircles. `chrome.ts` is the single answer now, and this
 * file is what keeps a second one from growing back: it reads the source of
 * every file that renders a control in that row and refuses the geometry
 * literals that would let one of them disagree again.
 *
 * A grep is the right instrument here and a render is not. These boxes are
 * Tailwind utilities, and jsdom has no layout engine — `size-11` computes to
 * nothing there, so a rendered assertion could only re-read the same class
 * string this reads, with more ceremony and a stack trace that points at the
 * wrong line. What the browser must confirm (that 44 really is 44) is confirmed
 * in the browser, against production, where a stylesheet actually exists.
 */

const HERE = join(__dirname);

/** Every file that renders a control in the top row. */
const TOP_ROW = [
  'Nav/NewChat.tsx',
  'Nav/BrandCorner.tsx',
  'Chat/PanelControls.tsx',
  'Chat/TemporaryChat.tsx',
  'Chat/ExportAndShareMenu.tsx',
  'Chat/Menus/BookmarkMenu.tsx',
  'Chat/Menus/CanvasToggle.tsx',
  'Chat/Menus/OpenSidebar.tsx',
  'Chat/Menus/HeaderNewChat.tsx',
];

/**
 * The file with its comments stripped.
 *
 * Comments are where the history of these boxes is written — chrome.ts explains
 * why 40 was wrong by naming `size-10`, and a scanner reading raw text calls
 * that a violation. Every rule below is about what the file RENDERS, so every
 * rule below reads code only.
 */
const source = (rel: string) =>
  readFileSync(join(HERE, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('the top row wears one box', () => {
  it('sizes to the 44px pointer floor, not 40', () => {
    expect(CONTROL).toContain('size-11');
    expect(CONTROL).not.toContain('size-10');
  });

  it('sizes the glyph here, where four call sites used to disagree', () => {
    // `icon-lg` (24), `icon-md` (18), a bare 24x24 <svg> and `size={20}` all
    // met in this row. A descendant selector outranks every one of them.
    expect(CONTROL).toContain('[&_svg]:size-5');
  });

  it('carries no ground until you point at it', () => {
    expect(CONTROL).toContain('bg-transparent');
    expect(CONTROL).toContain('hover:bg-surface-active-alt');
    // `bg-presentation` is the canvas colour: opaque, and over the backdrop
    // video it reads as a slab floating beside the controls that lack it.
    expect(CONTROL).not.toContain('bg-presentation');
    // `aria-expanded` is set by the sidebar toggles too, so keying the shared
    // ground on it lights a panel toggle for as long as its panel is open.
    expect(CONTROL).not.toContain('aria-expanded:');
    expect(CONTROL_OPEN).toBe('bg-surface-active-alt');
  });

  it('keys the row height on the POINTER, never on a width breakpoint', () => {
    // A narrow desktop window is still a mouse; a 768px tablet is still a thumb.
    // `md:min-h-9` got both backwards and shipped 36px rows to every tablet.
    expect(ROW).toContain('min-h-12');
    expect(ROW).not.toMatch(/\bmd:min-h-/);
    expect(ROW).toContain('hz-row');
  });

  it('rounds the same way in both grounds', () => {
    expect(CONTROL).toContain('rounded-full');
    expect(CONTROL).toContain('md:rounded-xl');
  });

  it.each(TOP_ROW)('%s sets no box of its own', (rel) => {
    const src = source(rel);
    // `size-10` is the 40px box that made Temporary chat the odd control in the
    // row; a bare `rounded-xl` is a second radius answer beside CONTROL's.
    expect(src).not.toMatch(/\bsize-10\b/);
    expect(src).not.toMatch(/\bbg-presentation\b/);
  });

  it('leaves the mark`s radius important, because the shell writes it inline', () => {
    // `HanzoAppLauncher` sets `border-radius: 999px` on its own trigger button.
    // An inline declaration outranks a class, so dropping the `!` here silently
    // restores the circle — no error, no type change, just a round corner.
    expect(source('Nav/BrandCorner.tsx')).toContain('!rounded-xl');
  });
});
