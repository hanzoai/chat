import { expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';

/** Substring of the reply emitted by the mock LLM server. */
export const MOCK_REPLY_TEXT = 'E2E mock reply';

/** Custom endpoints defined in e2e/config/chat.e2e.yaml. */
export const MOCK_ENDPOINTS = [
  { label: 'Mock Provider A', model: 'mock-model-a' },
  { label: 'Mock Provider B', model: 'mock-model-b' },
] as const;

export type MockEndpoint = { label: string; model: string };

export const NEW_CHAT_PATH = '/c/new';

type RefreshTokenBody = {
  token?: string;
};

export function isAgentsStream(response: Response) {
  return isAgentGenerationStart(response);
}

export function isAgentGenerationStart(response: Response) {
  const { pathname } = new URL(response.url());
  const isAgentsChat = pathname === '/v1/chat/agents/chat' || pathname.startsWith('/v1/chat/agents/chat/');
  return (
    response.request().method() === 'POST' &&
    isAgentsChat &&
    !pathname.endsWith('/abort') &&
    response.status() === 200
  );
}

/**
 * The header's model control.
 *
 * Addressed by id, not by name. The control deliberately never says "model" —
 * its accessible name is the effort question (`com_ui_think`) and its TEXT is
 * whatever is currently chosen — so a name-based locator here would pin a
 * translation, and an English one at that.
 */
const modelTrigger = (page: Page) => page.locator('#model-menu-button');

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Choose a model by the name the picker reads aloud.
 *
 * There is no endpoint step any more — no list of providers to drill through —
 * so this is the one selection helper and it replaces both of the two that were
 * here. Rows are `menuitemcheckbox`: `ModelSelector` marks every row with the
 * current choice, and `DropdownPopup` promotes any row carrying `ariaChecked`.
 *
 * The menu has TWO shapes and this handles both, because which one renders is a
 * property of the deployment rather than of the test: where the gateway serves
 * the enso tiers, the first list is the three effort stops and the models sit
 * behind `Advanced`; where it serves none of them, the models ARE the first
 * list. Reaching for `Advanced` only when the row is not already on screen
 * keeps one helper honest under both.
 */
export async function selectModel(page: Page, name: string) {
  const trigger = modelTrigger(page);
  await expect(trigger).toBeVisible();
  if ((await trigger.textContent())?.includes(name)) {
    return;
  }

  await trigger.click();
  const row = page.getByRole('menuitemcheckbox', {
    name: new RegExp(`(^|\\s)${escapeRegExp(name)}\\b`),
  });

  if (!(await row.isVisible({ timeout: 1000 }).catch(() => false))) {
    await page.getByRole('button', { name: 'Advanced' }).click();
    await expect(row).toBeVisible();
  }

  await row.click();
  await expect(trigger).toContainText(name);
}

/** The conversation messages container. */
export const messagesView = (page: Page) => page.getByRole('main');

/** Build the mock-model reply trigger and its expected rendered text for a label. */
export const replyPrompt = (label: string) => `E2E_REPLY:${label}`;
export const replyText = (label: string) => `E2E reply ${label}`;

/** The mock reply as rendered in the conversation, scoped to the messages view. */
export function mockReply(page: Page) {
  return messagesView(page).getByText(new RegExp(MOCK_REPLY_TEXT, 'i'));
}

/** Type a message, send it, and wait for the streamed `/v1/chat/agents` response. */
export async function sendMessage(page: Page, text: string): Promise<Response> {
  const input = page.getByRole('textbox', { name: 'Message input' });
  await input.click();
  await input.fill(text);
  const [response] = await Promise.all([
    page.waitForResponse(isAgentsStream, { timeout: 30000 }),
    input.press('Enter'),
  ]);
  return response;
}

export async function getAccessToken(page: Page): Promise<string> {
  const result = await page.evaluate(async () => {
    const response = await fetch('/v1/chat/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, text, json };
  });

  if (!result.ok) {
    throw new Error(
      `Expected /v1/chat/auth/refresh to return 2xx, got ${result.status}: ${result.text}`,
    );
  }

  const body = result.json as RefreshTokenBody | null;
  if (!body?.token) {
    throw new Error(`Expected /v1/chat/auth/refresh to return a token, got: ${result.text}`);
  }

  return body.token;
}

export async function requestJson<T>(
  page: Page,
  params: {
    path: string;
    token: string;
    method?: string;
    body?: unknown;
  },
): Promise<T> {
  const result = await page.evaluate(
    async ({ accessToken, body, method, urlPath }) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };
      const init: RequestInit = {
        method,
        credentials: 'include',
        headers,
      };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }
      const response = await fetch(urlPath, init);
      const text = await response.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { ok: response.ok, status: response.status, text, json };
    },
    {
      accessToken: params.token,
      body: params.body,
      method: params.method ?? 'GET',
      urlPath: params.path,
    },
  );

  if (!result.ok) {
    throw new Error(
      `Expected ${params.method ?? 'GET'} ${params.path} to return 2xx, got ${result.status}: ${result.text}`,
    );
  }
  return result.json as T;
}

export async function fetchJson<T>(page: Page, path: string, token: string): Promise<T> {
  return requestJson<T>(page, { path, token });
}
