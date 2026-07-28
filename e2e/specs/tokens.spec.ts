import { expect, test } from '@playwright/test';

/**
 * The token layer, asserted the only way that counts: at runtime, in a browser.
 *
 * An undefined custom property paints NOTHING and reports NOTHING, and a property
 * defined with the wrong VALUE TYPE is worse — the literal fallback in
 * `var(--border, #1f1f1f)` only fires when the name is undefined, so a name
 * declared as shadcn HSL channels (`--border: 0 0% 11%`) makes
 * `1px solid var(--border, #1f1f1f)` an invalid shorthand and the whole
 * declaration is dropped. That is exactly how @hanzo/iam's account menu rendered
 * with `border: 0px none` on this surface while every grep and every type-check
 * said it was fine. "It is declared" is not evidence; resolution is.
 */

const HOST = 'http://localhost:3080/';

/**
 * Names a library sets on a DESCENDANT at runtime, so they are legitimately absent
 * from <html>: tailwind's internals, Radix and Ariakit's positioning properties,
 * Sandpack's whole theme (--sp-*, --test-*), and shiki/streamdown/sonner/vaul.
 * `--f` is a @supports feature probe. Everything else must resolve.
 */
const RUNTIME_PREFIXES = [
  '--tw-',
  '--radix-',
  '--shiki-',
  '--streamdown-',
  '--sonner-',
  '--vaul-',
  '--hz-',
  '--sp-',
  '--test-',
  '--popover-available-',
];
/** `--f` is a @supports feature probe in a vendored stylesheet, not a token. */
const RUNTIME_NAMES = ['--f'];

test.describe('Design tokens', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`every token the served CSS references resolves (${theme})`, async ({ page }) => {
      await page.goto(HOST, { timeout: 15000 });
      await page.evaluate((t) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(t);
      }, theme);

      const unresolved = await page.evaluate(
        ({ prefixes, names }) => {
          const declared = new Set<string>();
          const referenced = new Set<string>();
          const collect = (text: string) => {
            for (const m of text.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) declared.add(m[1]);
            // Only names used WITHOUT a literal fallback can fail silently to nothing.
            for (const m of text.matchAll(/var\((--[a-zA-Z0-9-]+)\s*([,)])/g)) {
              if (m[2] === ')') referenced.add(m[1]);
            }
          };
          for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try {
              rules = (sheet as CSSStyleSheet).cssRules;
            } catch {
              continue; // cross-origin
            }
            for (const rule of Array.from(rules)) collect(rule.cssText);
          }
          const cs = getComputedStyle(document.documentElement);
          return Array.from(referenced)
            .filter((n) => !prefixes.some((p: string) => n.startsWith(p)) && !names.includes(n))
            .filter((n) => !declared.has(n))
            .filter((n) => cs.getPropertyValue(n).trim() === '');
        },
        { prefixes: RUNTIME_PREFIXES, names: RUNTIME_NAMES },
      );

      expect(unresolved, `custom properties referenced with no fallback and never defined`).toEqual(
        [],
      );
    });

    test(`the @hanzo/iam account menu paints (${theme})`, async ({ page }) => {
      await page.goto(HOST, { timeout: 15000 });
      await page.evaluate((t) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(t);
      }, theme);

      // The rule @hanzo/iam >=0.21.1 injects for `.hz-iam-menu`, verbatim.
      const painted = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.cssText = [
          'position:fixed;top:-9999px;left:0;width:240px;height:120px',
          'color: var(--foreground, #ededed)',
          'background: var(--popover, #0a0a0a)',
          'border: 1px solid var(--border, #1f1f1f)',
          'border-radius: var(--radius-lg, 0.75rem)',
          'box-shadow: var(--shadow-floating, 0 25px 50px -12px rgb(0 0 0 / .25))',
          'font-size: var(--text-sm, 0.8125rem)',
        ].join(';');
        document.body.appendChild(el);
        const s = getComputedStyle(el);
        const out = {
          borderStyle: s.borderTopStyle,
          borderWidth: s.borderTopWidth,
          borderColor: s.borderTopColor,
          background: s.backgroundColor,
          radius: s.borderTopLeftRadius,
          shadow: s.boxShadow,
          color: s.color,
          fontSize: s.fontSize,
        };
        el.remove();
        return out;
      });

      expect(painted.borderStyle, 'menu border was dropped').toBe('solid');
      expect(painted.borderWidth).toBe('1px');
      expect(painted.borderColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(painted.background, 'menu box is transparent').not.toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(painted.radius)).toBeGreaterThan(0);
      expect(painted.shadow).not.toBe('none');
      expect(parseFloat(painted.fontSize)).toBeGreaterThan(0);
    });
  }

  test('the stacking ladder is @hanzo/design’s, and it is ordered', async ({ page }) => {
    await page.goto(HOST, { timeout: 15000 });
    const z = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const n = (k: string) => Number(cs.getPropertyValue('--z-' + k).trim());
      return {
        raised: n('raised'),
        sticky: n('sticky'),
        header: n('header'),
        dropdown: n('dropdown'),
        overlay: n('overlay'),
        modal: n('modal'),
        popover: n('popover'),
        toast: n('toast'),
        tooltip: n('tooltip'),
        notification: n('notification'),
      };
    });
    const ladder = [
      z.raised,
      z.sticky,
      z.header,
      z.dropdown,
      z.overlay,
      z.modal,
      z.popover,
      z.toast,
    ];
    expect(ladder.every((v) => Number.isFinite(v))).toBe(true);
    expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
    // @hanzo/brand spelled the top two rungs differently; both must land on one rung.
    expect(z.tooltip).toBe(z.popover);
    expect(z.notification).toBe(z.toast);
  });
});
