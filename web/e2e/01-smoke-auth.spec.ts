import { expect, test } from '@playwright/test';

import { signIn } from './fixtures/auth';

/**
 * Smoke tests — anything that goes wrong here invalidates the rest of
 * the suite, so they run first. Keep them dumb and fast: no DB writes,
 * no extra navigations beyond what's needed to confirm the stack is up.
 */
test.describe('smoke + auth', () => {
  test('sign-in page renders the form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('Olivia signs in and lands on /providers', async ({ page }) => {
    await signIn(page);
    // After Phase 1 the post-sign-in landing is /providers. Confirm the
    // URL and that the page mounted (the header nav is asserted inside
    // signIn, so the H1 here is just a sanity check on the destination).
    await expect(page).toHaveURL(/\/providers(\?|$)/);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
