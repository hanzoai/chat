import { test, expect, type Page } from '@playwright/test';

/**
 * The composer, measured in a real browser: the send chord and what it does
 * with the keystroke an IME has claimed.
 *
 * It rides the chrome config because that is the one harness here that needs no
 * login — `ALLOW_GUEST_CHAT` renders the real shell for an anonymous visitor.
 *
 * The rules under test are `sends` and `ready` from `@hanzo/ui/chat`, and they
 * have unit tests. What only a browser can answer is whether the composer is
 * handing them the right event: React's synthetic `KeyboardEvent` carries no
 * `isComposing` at all, so a composer that passes `e` instead of `e.nativeEvent`
 * judges an IME candidate on two signals out of three, compiles, and reads fine.
 *
 * The ANSWER is not asserted here, and that is a harness limit rather than a
 * choice: `packages/api`'s `applyTestRunHook` — the one thing that can swap a
 * real provider for the agents package's fake model — has no caller, so a send
 * reaches the gateway and is refused. What is asserted instead is that the send
 * LEAVES: the completion POST and the stream that follows it. The turn frame
 * those tokens land in is held by `components/Messages/__tests__/Turn.spec.tsx`
 * and the follow decision by `hooks/Messages/__tests__/useMessageScrolling.spec.tsx`.
 */

/**
 * `@hanzo/ai`'s free-tier consent record, as a visitor who has already answered
 * the dialog carries it.
 *
 * Without it the run measures nothing and says nothing about why: a free send is
 * HELD at `useChatFunctions.ask` until consent is given, so the draft stays in
 * the box, no request is made, and nothing is logged anywhere. A guest is always
 * on the free route. Keep the version in step with `FREE_CONSENT_VERSION` — a
 * stale one reads as no consent at all.
 */
const CONSENT = { key: 'hanzo.free.consent', version: '2026-08-14' };

async function land(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      /* The signed-out SSO probe navigates the document to hanzo.id on first
         paint; spending it up front keeps the run on localhost. */
      try {
        sessionStorage.setItem('hanzo.sso.probed', '1');
        localStorage.setItem(
          key,
          JSON.stringify({ granted: true, at: new Date().toISOString(), version }),
        );
      } catch {
        /* storage unavailable — the probe declines on its own */
      }
    },
    CONSENT,
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/c/new');
  await page.waitForSelector('[data-testid="text-input"]', { timeout: 30000 });
}

/** The completion the composer's submit reaches. */
const COMPLETION = /\/v1\/chat\/agents\/chat\//;

test.describe('the composer', () => {
  test('offers to send only a draft with something in it', async ({ page }) => {
    await land(page);
    const input = page.getByTestId('text-input');
    const send = page.getByTestId('send-button');

    await expect(send).toBeDisabled();
    await input.fill('   ');
    await expect(send).toBeDisabled();
    await input.fill('a real question');
    await expect(send).toBeEnabled();
  });

  test('does NOT send the Enter that accepts an IME candidate', async ({ page }) => {
    await land(page);
    const input = page.getByTestId('text-input');

    let posted = false;
    page.on('request', (r) => {
      if (COMPLETION.test(r.url())) {
        posted = true;
      }
    });

    await input.fill('なぜ');
    await expect(page.getByTestId('send-button')).toBeEnabled();
    await input.evaluate((el) => {
      const held = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(held, 'isComposing', { value: true });
      el.dispatchEvent(held);
    });
    await page.waitForTimeout(1500);

    expect(posted).toBe(false);
    await expect(input).toHaveValue('なぜ');
  });

  test('writes a newline on Shift+Enter and sends nothing', async ({ page }) => {
    await land(page);
    const input = page.getByTestId('text-input');

    let posted = false;
    page.on('request', (r) => {
      if (COMPLETION.test(r.url())) {
        posted = true;
      }
    });

    await input.fill('first line');
    await input.press('Shift+Enter');
    await input.pressSequentially('second line');
    await page.waitForTimeout(500);

    expect(posted).toBe(false);
    await expect(input).toHaveValue('first line\nsecond line');
  });

  test('Enter sends: the completion leaves and its stream opens', async ({ page }) => {
    await land(page);
    const input = page.getByTestId('text-input');

    const post = page.waitForRequest(
      (r) => COMPLETION.test(r.url()) && r.method() === 'POST',
      { timeout: 30000 },
    );
    const stream = page.waitForRequest(
      (r) => r.url().includes('/v1/chat/agents/chat/stream/'),
      { timeout: 30000 },
    );

    await input.fill('what is in a turn');
    await expect(page.getByTestId('send-button')).toBeEnabled();
    await input.press('Enter');

    expect((await post).method()).toBe('POST');
    expect((await stream).url()).toContain('/v1/chat/agents/chat/stream/');
  });
});
