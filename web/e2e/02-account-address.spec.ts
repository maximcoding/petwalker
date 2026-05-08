import { expect, test } from '@playwright/test';

import { signIn } from './fixtures/auth';

/**
 * The Account section on /profile gained an address textarea in Slice 1.
 * Verify it round-trips: type something, save, reload, the value is
 * still there. Also confirms the user.address field is being persisted
 * through the API and re-read by the form.
 */
test.describe('account home address', () => {
  test('save and round-trip', async ({ page }) => {
    await signIn(page);
    await page.goto('/profile');

    // The "Account" card renders the AddressField with label
    // "Home address" — see web/src/i18n/locales/en.json (address.homeLabel).
    const addressField = page.getByLabel(/home address/i);
    await expect(addressField).toBeVisible();

    const sentinel = `e2e-${Date.now()} Test Lane, Brooklyn, NY 11201`;
    await addressField.fill(sentinel);

    await page.getByRole('button', { name: /save account/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    // Reload the whole page and confirm the value is still in the field.
    // This checks both the API persisted it and the form re-hydrated it.
    await page.reload();
    await expect(page.getByLabel(/home address/i)).toHaveValue(sentinel);
  });

  test('clearing the field saves null', async ({ page }) => {
    await signIn(page);
    await page.goto('/profile');

    // Set then clear, then save — this exercises the tri-state semantics
    // the backend uses for `address: null` (clear) vs `address: undefined`
    // (leave alone).
    const addressField = page.getByLabel(/home address/i);
    await addressField.fill('temporary');
    await page.getByRole('button', { name: /save account/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    await addressField.fill('');
    await page.getByRole('button', { name: /save account/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/home address/i)).toHaveValue('');
  });
});
