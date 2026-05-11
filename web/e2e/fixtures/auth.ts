import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Default credentials for the seeded test owner — sub stays the same
 * (so backend seeds still attach pets+bookings to this row), only the
 * email attribute on the cognito-local user was renamed. The Olivia*
 * exports are kept for historical clarity; new specs may import the
 * neutral aliases (TEST_EMAIL / TEST_PASSWORD) below.
 *
 * Override via E2E_EMAIL / E2E_PASSWORD env if you've changed seed
 * credentials.
 */
export const TEST_EMAIL = process.env.E2E_EMAIL ?? 'admin@admin';
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Password123!';
export const OLIVIA_EMAIL = TEST_EMAIL;
export const OLIVIA_PASSWORD = TEST_PASSWORD;

/**
 * Sign in via the UI. Uses the email/password fields directly — selectors
 * key off the visible label text so they don't break when classNames change.
 *
 * Returns once the post-sign-in landing route (/providers) has rendered.
 * Throws via Playwright's expect if anything along the way doesn't behave.
 */
export async function signIn(
  page: Page,
  email = OLIVIA_EMAIL,
  password = OLIVIA_PASSWORD,
): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // After the IA refactor (Phase 1), sign-in pushes to /providers — the
  // owner's default landing page. Wait for the URL change explicitly so
  // we don't race the page-load below.
  await page.waitForURL(/\/providers(\?|$)/, { timeout: 15_000 });
  // Smoke: header nav should mount once the (app) shell renders. "Pets"
  // is owner-mode only and Olivia is a seeded owner.
  await expect(page.getByRole('link', { name: /pets/i })).toBeVisible();
}
