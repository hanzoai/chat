/**
 * A code-execution call is watched WHILE it runs, and it can be stopped.
 *
 * WHAT THIS HAS TO SHOW. A tool call's `output` is set when the tool RETURNS, so
 * a command that takes minutes was a spinner and then a wall of text. Cloud now
 * appends the command's output to the run's session log as it is produced, the
 * server tells the browser where that log is (`run: {session, sandbox}`, on an
 * `on_run_step_delta` sent before the command starts), and the call tails it.
 * The claim is therefore about a moment in time — bytes on screen while the tool
 * has not returned — and the only honest check is to look at the screen then.
 *
 * WHERE THE STUB SITS. `window.fetch`, for two URLs: the live feed and the stop.
 * Playwright's own interception cannot express this — `route.fulfill` sends a
 * body whole, and a stream that arrives all at once is precisely the bug. Below
 * that door everything is the shipping code: `useRunLog`'s reader and decoder,
 * `Part.tsx`'s routing, `ExecuteCode`, and the Stop control's own request.
 *
 * WHERE THE DATA COMES FROM. The real store. `npm run e2e:live` seeds a
 * conversation whose assistant message carries a tool call with `progress < 1`,
 * no output, and a `run` — exactly the state the server puts on the wire just
 * before a command starts — and mints the session, because this fork has no
 * local login route. So the component tree renders the same shape it will see
 * in production, read back through the real API.
 *
 * RUN IT:
 *   PORT=3081 npm run backend:dev
 *   BACKEND_PORT=3081 PORT=3091 npm run frontend:dev
 *   E2E_REFRESH=$(npm run -s e2e:live | cut -d= -f2-) \
 *     npx playwright test --config=e2e/playwright.config.live.ts
 */

import { test, expect, type Page } from '@playwright/test';

const CONVO = '11111111-1111-4111-8111-111111111111';
const SESSION = 'sess_chat_1';
const SANDBOX = 'sbx_chat_1';

declare global {
  interface Window {
    __run: {
      /** Push one SSE frame onto the live feed. */
      feed(frame: string): void;
      /** What the Stop control sent, once it has sent it. */
      stopped: unknown;
    };
  }
}

/** One feed frame, in the shape cloud emits. */
const feedFrame = (kind: string, payload: unknown) =>
  `event: event\ndata: ${JSON.stringify({ event: { sessionId: SESSION, kind, payload } })}\n\n`;

const output = (message: string) => feedFrame('log', { message });
const lifecycle = (step: string, message: string) => feedFrame('tool-call', { step, message });

/**
 * Shim the two run URLs before any app code runs.
 *
 * The feed is a `ReadableStream` the test feeds by hand, which is what makes
 * "the third line has arrived and the tool has not returned" an expressible
 * state rather than a race.
 */
async function stubRun(page: Page) {
  await page.addInitScript(() => {
    const encode = (s: string) => new TextEncoder().encode(s);
    let push: ((chunk: string) => void) | null = null;
    const pending: string[] = [];

    window.__run = {
      feed: (frame) => (push ? push(frame) : pending.push(frame)),
      stopped: null,
    };

    const real = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url.includes('/v1/chat/runs/stream')) {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            push = (chunk) => controller.enqueue(encode(chunk));
            pending.splice(0).forEach(push);
          },
        });
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        });
      }
      if (url.includes('/v1/chat/runs/stop')) {
        window.__run.stopped = JSON.parse(String(init?.body ?? '{}'));
        return new Response(JSON.stringify({ ok: true, stopped: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return real(input as RequestInfo, init);
    };
  });
}

test.describe('watching a code run', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    const refresh = process.env.E2E_REFRESH;
    expect(refresh, 'E2E_REFRESH must carry a minted refreshToken cookie').toBeTruthy();
    const url = new URL(baseURL ?? 'http://localhost:3091');
    await context.addCookies([
      { name: 'refreshToken', value: refresh!, domain: url.hostname, path: '/' },
    ]);
    // The signed-out SSO probe navigates the DOCUMENT to hanzo.id once per
    // visit. It is bounded by exactly this flag, so spending it up front is how
    // a test keeps the page it asked for (see CLAUDE.md, "Silent SSO").
    await page.addInitScript(() => {
      window.sessionStorage.setItem('hanzo.sso.probed', '1');
    });
    await stubRun(page);
  });

  /**
   * ONE test, because it is one flow and because the session is one use.
   *
   * `setAuthTokens` ROTATES the refresh token, so the first context to boot
   * spends it and a second `test()` renders signed out — which shows up as
   * hanzo.id's "invalid redirect_uri", not as a missing button, and costs an
   * hour if you go looking for the button.
   */
  test('shows the command working, then stops the work and keeps the sandbox', async ({ page }) => {
    await page.goto(`/c/${CONVO}`, { waitUntil: 'domcontentloaded' });

    // The call is on screen and running — no output, so nothing has returned.
    const stop = page.getByRole('button', { name: /stop the running command/i });
    await expect(stop).toBeVisible({ timeout: 60_000 });
    // The label is the promise: this ends the WORK, not the sandbox.
    await expect(stop).toHaveAttribute('title', /sandbox.*(stay|keep)/i);

    // Now the sandbox narrates, one line at a time, each read BEFORE the next is
    // sent — so every assertion is a moment when the command is still running.
    await page.evaluate((f) => window.__run.feed(f), lifecycle('leased', `sandbox ${SANDBOX} (exec)`));
    await expect(page.getByText(`sandbox ${SANDBOX} (exec)`)).toBeVisible({ timeout: 20_000 });

    await page.evaluate((f) => window.__run.feed(f), output('collecting numpy\n'));
    await expect(page.getByText('collecting numpy')).toBeVisible();

    await page.evaluate((f) => window.__run.feed(f), output('building wheel for numpy\n'));
    await expect(page.getByText('building wheel for numpy')).toBeVisible();
    await page.screenshot({ path: 'e2e/test-results/chat-live-run.png' });

    await stop.click();
    // It acted on the SANDBOX, which is the handle stop takes.
    await expect
      .poll(() => page.evaluate(() => window.__run.stopped))
      .toEqual({ sandbox: SANDBOX });
    await page.screenshot({ path: 'e2e/test-results/chat-stopped.png' });
  });
});
