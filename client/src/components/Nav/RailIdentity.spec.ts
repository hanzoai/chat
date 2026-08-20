import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE RAIL SAYS WHETHER ANYONE IS SIGNED IN.
 *
 * The sidebar's foot used to be gated on `!collapsed` together with the
 * conversation list, which reads as one rule and is two. A list of titles
 * genuinely cannot render at 56px. WHO YOU ARE is exactly one avatar wide.
 *
 * Collapsed, the corner was therefore empty in BOTH states — a visitor and a
 * paying customer saw an identical sidebar — so the first question anyone asks
 * of a chat surface, before typing anything into it, had no answer on screen.
 *
 * This is a SOURCE scan rather than a render, for the reason `chrome.spec.ts`
 * gives: `Nav.tsx` reaches the whole app (auth context, react-query, the store,
 * a lazy Suspense boundary), so rendering it to assert one gate would test the
 * harness. What is asserted here is the gate itself, which is the thing that
 * regressed and the thing a future edit would undo.
 */
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8');

/** Source with comments removed — this file's own explanation quotes the gate. */
const code = (f: string) =>
  read(f)
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '');

describe('the collapsed rail carries an identity', () => {
  it('renders the foot in BOTH states, not only when open', () => {
    const src = code('Nav.tsx');
    const foot = src.indexOf('<Suspense fallback={<Skeleton');
    expect(foot).toBeGreaterThan(-1);

    // A LOCAL check, and the first version of it was not. Comparing the last
    // `{!collapsed &&` against the last `</Suspense>` before the foot looked
    // like an enclosure test and is not one: the nearest preceding gate is the
    // CONVERSATION LIST's, a sibling that closes before the foot begins, so the
    // assertion failed against correct code. What actually distinguishes the
    // bug is that the gate sat immediately around this block — so that is what
    // is read, in the span right before it.
    expect(src.slice(Math.max(0, foot - 160), foot)).not.toMatch(/!collapsed/);
  });

  it('hands each half the width it has to render at', () => {
    const src = code('Nav.tsx');
    expect(src).toMatch(/<AccountSettings\s+collapsed=\{collapsed\}/);
    expect(src).toMatch(/<Visitor\s+collapsed=\{collapsed\}/);
  });

  it('keeps the signature open-only — it is a sentence, not a glyph', () => {
    // "Powered by Hanzo AI" is the one part of the foot with nowhere to go at
    // 56px, so it stays gated. That is what makes the gate above a decision
    // rather than an oversight.
    expect(code('Nav.tsx')).toMatch(/\{!collapsed && <Signature \/>\}/);
  });

  it('the signed-out rail offers a way IN, with a name for screen readers', () => {
    const src = code('Visitor.tsx');
    expect(src).toMatch(/if \(collapsed\)/);
    expect(src).toMatch(/data-testid="rail-log-in"/);
    // A glyph with no accessible name is a button that only sighted pointer
    // users can identify — and this one is the only control in the corner.
    expect(src).toMatch(/aria-label=\{localize\('com_nav_log_in'\)\}/);
    expect(src).toMatch(/title=\{localize\('com_nav_log_in'\)\}/);
  });

  it('the signed-in rail keeps the avatar and drops only the label', () => {
    const src = code('AccountSettings.tsx');
    // `triggerLabel` is @hanzo/iam's own seam for a trigger with no room for
    // its text, so the rail spends the shared control rather than growing a
    // second account control of chat's own.
    expect(src).toMatch(/triggerLabel: collapsed \? 'sr-only' : undefined/);
    expect(src).toMatch(/collapsed && 'justify-center px-0'/);
  });
});
