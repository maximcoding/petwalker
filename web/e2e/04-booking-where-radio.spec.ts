import { expect, test } from '@playwright/test';

import { signIn } from './fixtures/auth';

/**
 * Owner-side booking form must respect the offering's `supportedSources`
 * allow-list:
 *   - 0 enabled  → no Where section (defensive — DB CHECK prevents this)
 *   - 1 enabled  → static label, no radio group
 *   - 2+ enabled → radio group, only the enabled options visible
 *
 * The seeded providers (`db:bulk-seed`) all default to supports_owner=true
 * with the others false (column DEFAULT). So a provider chosen at random
 * should render the single-source label path. We pick one via /providers.
 */
test.describe('booking-form Where gating', () => {
  test('single supported source — renders as a static label, no radios', async ({ page }) => {
    await signIn(page);

    // Olivia's role is `owner` by default — /providers works for owners.
    // Pick the first provider in the listing (any will do; bulk-seed
    // populates with default supports_owner=true).
    await page.goto('/providers');
    const firstCard = page.getByRole('link').filter({ has: page.getByText(/walking/i) }).first();
    // Fallback if the Walking chip isn't already selected — click it first.
    const walkingChip = page.getByRole('button', { name: /^walking$/i });
    if (await walkingChip.isVisible().catch(() => false)) {
      await walkingChip.click();
    }

    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    // Click the Walking offering's Book button on the provider detail page.
    const bookBtn = page.getByRole('link', { name: /^book$/i }).first();
    await bookBtn.click();
    await page.waitForURL(/\/book/);

    // Where section: with only `owner` supported, we expect a single
    // static label inside the Where block — NOT a fieldset of radios.
    const whereLabel = page.getByText(/^where$/i).first();
    await expect(whereLabel).toBeVisible();

    // No radio inputs in the Where section.
    const radios = page.locator('input[type="radio"][name="addr-source"]');
    await expect(radios).toHaveCount(0);

    // The pet-home label should be present (since supports.owner=true).
    await expect(page.getByText(/at my pet's home/i)).toBeVisible();
  });
});
