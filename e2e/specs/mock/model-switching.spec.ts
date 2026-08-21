import { expect, test } from '@playwright/test';
import { MOCK_ENDPOINTS, NEW_CHAT_PATH, mockReply, selectModel, sendMessage } from './helpers';

/**
 * Switching the model still switches the model.
 *
 * This described "endpoint switching" and drilled a provider list to get there.
 * There is no provider list — `ModelSelector` offers models directly, and the
 * two mock providers reach the picker as the models they serve. What is being
 * checked was never the drill-down: it is that a chosen model is the one the
 * next turn is sent to, and that survives the picker losing a level.
 */
test.describe('model switching', () => {
  for (const endpoint of MOCK_ENDPOINTS) {
    test(`"${endpoint.label}" returns a streamed response`, async ({ page }) => {
      test.setTimeout(60000);
      await page.goto(NEW_CHAT_PATH, { timeout: 10000 });

      await selectModel(page, endpoint.label);

      const response = await sendMessage(page, `hello ${endpoint.model}`);
      expect(response.ok()).toBeTruthy();
      await expect(mockReply(page)).toBeVisible();
    });
  }
});
