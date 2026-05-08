import { expect, test } from '@playwright/test';

import { signIn } from './fixtures/auth';

/**
 * Slice 2 — provider opts in to supported address sources. Verifies:
 *   - the offering row renders three checkboxes (owner / provider / custom)
 *   - the last checked box can't be un-checked (UI guard)
 *   - selections round-trip through save + reload
 *
 * Olivia is bootstrapped as `role: 'owner'` by the seed; promote her to
 * `both` so the Offerings section is visible. We do this via the same
 * /profile UI to keep the test honest about real user paths.
 */
test.describe('offering supported sources', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/profile');
    // Switch to Both so provider sections render. Idempotent: clicking
    // "Both" twice is fine.
    const bothBtn = page.getByRole('button', { name: /^both$/i });
    if (await bothBtn.isVisible().catch(() => false)) {
      await bothBtn.click();
      // Wait for the Offerings card to appear after the role flip.
      await expect(page.getByRole('heading', { name: /offerings/i })).toBeVisible();
    }
  });

  test('three supported-source checkboxes render on each offering row', async ({ page }) => {
    // Find the Walking row by its label and inspect the three checkboxes.
    // Each row is an <li> — scope the query so we don't pick up another
    // service's checkboxes by accident.
    const walkingRow = page.locator('li').filter({ hasText: /^Walking/ }).first();
    await expect(walkingRow).toBeVisible();

    await expect(walkingRow.getByLabel(/at the owner's place/i)).toBeVisible();
    await expect(walkingRow.getByLabel(/at my location/i)).toBeVisible();
    await expect(walkingRow.getByLabel(/anywhere the owner picks/i)).toBeVisible();
  });

  test('UI blocks unticking the last enabled checkbox', async ({ page }) => {
    const walkingRow = page.locator('li').filter({ hasText: /^Walking/ }).first();

    // Per per-service defaults, Walking starts as { owner: true, provider/custom: false }.
    // First confirm that's the rendered state.
    const ownerCb = walkingRow.getByLabel(/at the owner's place/i);
    const providerCb = walkingRow.getByLabel(/at my location/i);
    const customCb = walkingRow.getByLabel(/anywhere the owner picks/i);
    await expect(ownerCb).toBeChecked();
    await expect(providerCb).not.toBeChecked();
    await expect(customCb).not.toBeChecked();

    // Try to untick the only enabled checkbox — the component blocks the
    // state change, so the checkbox should remain checked.
    await ownerCb.click();
    await expect(ownerCb).toBeChecked();
  });

  test('saving multi-source selection round-trips', async ({ page }) => {
    // Pick Photography because its default already includes both owner and
    // provider, so toggling custom is a small, reversible change.
    const photoRow = page.locator('li').filter({ hasText: /Photography/ }).first();
    await expect(photoRow).toBeVisible();

    const customCb = photoRow.getByLabel(/anywhere the owner picks/i);
    const wasChecked = await customCb.isChecked();

    // Set a price so the Save button enables (Save is disabled when
    // hourly is empty/invalid).
    const hourlyInput = photoRow.getByPlaceholder('25.00');
    await hourlyInput.fill('100.00');

    // Toggle custom and save.
    await customCb.click();
    const expectedAfter = !wasChecked;

    await photoRow.getByRole('button', { name: /(save|add)/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    // Reload, find the row again, confirm the toggled value persisted.
    await page.reload();
    const photoRowAfter = page.locator('li').filter({ hasText: /Photography/ }).first();
    if (expectedAfter) {
      await expect(photoRowAfter.getByLabel(/anywhere the owner picks/i)).toBeChecked();
    } else {
      await expect(photoRowAfter.getByLabel(/anywhere the owner picks/i)).not.toBeChecked();
    }

    // Restore to the prior state so subsequent test runs aren't dependent
    // on the previous run's ordering.
    if (expectedAfter !== wasChecked) {
      await photoRowAfter.getByLabel(/anywhere the owner picks/i).click();
      await photoRowAfter.getByRole('button', { name: /(save|add)/i }).click();
      await expect(page.getByText(/saved/i).first()).toBeVisible();
    }
  });
});
