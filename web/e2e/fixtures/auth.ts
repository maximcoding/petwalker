import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Default credentials for the seeded test owner — created by
 * `pnpm --filter @petwalker/backend db:bulk-seed`. Override via env if
 * you want to reuse this helper on a different account.
 */
export const OLIVIA_EMAIL =
  process.env.E2E_EMAIL ?? 'olivia@petwalker.test';
export const OLIVIA_PASSWORD =
  process.env.E2E_PASSWORD ?? 'Password123!';

/**
 * Sign in via the UI. Uses the email/password fields directly — selectors
 * key off the visible label text so they don't break when classNames change.
 *
 * Returns once the post-sign-in route (/me) has rendered. Throws via
 * Playwright's expect if anything along the way doesn't behave.
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
  // After auth Next.js pushes /me. Wait for the URL change explicitly so
  // we don't race the page-load below.
  await page.waitForURL(/\/me$/, { timeout: 15_000 });
  // Smoke: header nav should mount once /me renders.
  await expect(page.getByRole('link', { name: /pets/i })).toBeVisible();
}
