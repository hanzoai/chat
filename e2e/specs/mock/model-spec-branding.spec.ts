import { expect, test } from '@playwright/test';
import { getPrimaryE2EUser } from '../../setup/users.mock';
import { NEW_CHAT_PATH, selectModel } from './helpers';

/** Spec with `showOnLanding: true` and an HTML `description` in e2e/config/chat.e2e.yaml. */
const BRANDED_SPEC = {
  label: 'E2E Branded',
  descriptionText: 'Branded answers',
  descriptionIcon: '/assets/openai.svg',
};

/** The `softDefault: true` spec does not set `showOnLanding`, so it is unbranded. */
const UNBRANDED_SPEC_LABEL = 'E2E Soft Default';

test.describe('model spec branding on landing', () => {
  test('branded spec replaces the greeting with its label and rendered description', async ({
    page,
  }) => {
    await page.goto(NEW_CHAT_PATH, { timeout: 10000 });
    await selectModel(page, BRANDED_SPEC.label);

    const main = page.getByRole('main');
    await expect(main).toContainText(BRANDED_SPEC.label);
    await expect(main).toContainText(BRANDED_SPEC.descriptionText);
    await expect(main.locator(`img[src$="${BRANDED_SPEC.descriptionIcon}"]`)).toBeVisible();

    const user = getPrimaryE2EUser();
    await expect(main).not.toContainText(user.name);
  });

  test('unbranded spec keeps the personalized greeting', async ({ page }) => {
    await page.goto(NEW_CHAT_PATH, { timeout: 10000 });
    await selectModel(page, UNBRANDED_SPEC_LABEL);

    const user = getPrimaryE2EUser();
    await expect(page.getByRole('main')).toContainText(user.name);
  });

  /* The third test here asserted the spec's description INSIDE the picker, and
     it is deleted rather than re-selectored: a row is `{icon}{label}` now and
     carries no second line, so there is no longer a description in the menu to
     find. Re-pointing it at the new row would have produced a test that passes
     by looking for nothing. The description still renders, on the landing —
     which is what the first test above already measures. */
});
