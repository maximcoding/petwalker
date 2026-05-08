import { expect, test } from '@playwright/test';

import { OLIVIA_EMAIL, signIn } from './fixtures/auth';

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

  test('Olivia signs in and lands on /me', async ({ page }) => {
    await signIn(page);
    // /me should render a greeting that includes either Olivia's name or
    // her email (the page falls back to email when fullName is null).
    const greeting = page.getByRole('heading', { level: 1 });
    await expect(greeting).toContainText(/Welcome,/i);
    await expect(greeting).toContainText(new RegExp(OLIVIA_EMAIL.split('@')[0]!, 'i'));
  });
});
