import { expect, test, type Page } from '@playwright/test';

/**
 * Responsive smoke — verifies the App Shell + token system render
 * cleanly across the four canonical viewports defined in
 * `.claude/skills/dogwalk-design/SKILL.md` Phase 9.
 *
 * For each (route, viewport) combination:
 *   1. Page loads without horizontal scroll.
 *   2. The brand logo is visible (App Shell mounted).
 *   3. No console errors (light noise tolerated; only failures fail the test).
 *
 * Routes covered are the unauthenticated ones — they don't require the
 * backend to be up. Authenticated route smoke lives in 01-smoke-auth.
 */

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 640 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const ROUTES = ['/sign-in', '/sign-up'] as const;

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    viewWidth: document.documentElement.clientWidth,
  }));
  // Allow 1px rounding tolerance on retina/scaled viewports.
  expect(overflow.docWidth, 'no horizontal scroll').toBeLessThanOrEqual(
    overflow.viewWidth + 1,
  );
}

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`${route} renders at ${vp.name} (${vp.width}×${vp.height})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // App Shell sanity — petwalker wordmark in header is reachable on
      // unauth routes too (logo links to home).
      await expect(page.getByText(/petwalker/i).first()).toBeVisible();

      await expectNoHorizontalScroll(page);

      // Ignore i18next "missing key" warnings (still acceptable in
      // dev), and Next dev-only warnings; everything else fails.
      const real = errors.filter(
        (e) => !/i18next|hydration warning|favicon|workbox|sw\.js/i.test(e),
      );
      expect(real, `console errors: ${real.join(' | ')}`).toEqual([]);
    });
  }
}
