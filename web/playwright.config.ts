import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — runs only against a locally-running dev stack:
 * Postgres + cognito-local + backend + web. The tests assume:
 *   - `pnpm --filter @petwalker/backend db:migrate`
 *   - `pnpm --filter @petwalker/backend db:bulk-seed` has been run so
 *     Olivia (olivia@petwalker.test / Password123!) exists.
 *   - Backend is up on http://localhost:3001
 *   - Web is up on http://localhost:3030
 *
 * We don't auto-spawn the apps (would tangle migration + seed timing
 * with test setup). Run `make up`, `pnpm dev` in another terminal,
 * then `pnpm --filter @petwalker/web test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  // Quick failure feedback in CI — locally a single retry is enough to
  // smooth over the occasional flake from auth state.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Parallelism is opt-in: most tests share Olivia's account, so writes
  // to her profile/offerings would race. Single worker by default; tests
  // that touch independent data can opt in via test.describe.parallel.
  workers: process.env.CI ? 1 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
