# e2e — Playwright

End-to-end tests covering the booking-address flow added in Slice 1 + Slice 2.

## Prereqs

Same as local dev. Tests run against the live stack — no in-memory DB,
no Storybook stub. Bring it up first:

```sh
cd /path/to/dogwalk

# Containers + cognito-local + MinIO
make up

# Apply all migrations
pnpm --filter @petwalker/backend db:migrate

# Seed Olivia + 10K providers (heavy seed; needed because the tests
# expect Olivia to exist and provider listings to be populated)
pnpm --filter @petwalker/backend db:bulk-seed

# In two terminals:
pnpm --filter @petwalker/backend dev
pnpm --filter @petwalker/web     dev
```

Confirm `http://localhost:3001/health` and `http://localhost:3030/sign-in`
both respond before running the suite.

## Install Playwright (first time only)

```sh
pnpm install                                     # picks up @playwright/test
pnpm --filter @petwalker/web test:e2e:install    # downloads chromium
```

## Run

```sh
pnpm --filter @petwalker/web test:e2e            # headless
pnpm --filter @petwalker/web test:e2e:ui         # interactive UI mode
```

A failing test drops a screenshot under `web/test-results/` and an HTML
report under `web/playwright-report/` (open with `pnpm --filter @petwalker/web exec playwright show-report`).

## What's covered

- `01-smoke-auth.spec.ts` — sign-in form renders; Olivia signs in and lands on `/providers` (the post-IA-refactor default landing).
- `02-account-address.spec.ts` — home address round-trips through save/reload; clearing it persists null.
- `03-offering-supported-sources.spec.ts` — three supported-source checkboxes per offering; UI blocks unticking the last enabled box; multi-source saves round-trip.
- `04-booking-where-radio.spec.ts` — booking form shows static label (no radio) when only one source supported; default-seeded providers fall into this case.

## Test data assumptions

- `admin@admin` / `Password123!` exists with `role: 'owner'` (same underlying cognito-local user as the prior `olivia@petwalker.test`; sub is unchanged so backend seeds still attach). Override via `E2E_EMAIL` / `E2E_PASSWORD` env if you've changed seed credentials.
- The bulk seed has run, so `/providers` has at least one Walking provider.
- Tests that flip Olivia's role to `Both` are idempotent (clicking Both twice is fine).
- Tests share Olivia's account — workers are pinned to 1 to avoid races on her profile/offerings. Tests that touch separate data can opt in via `test.describe.parallel`.

## Debugging a flaky test

```sh
pnpm --filter @petwalker/web exec playwright test e2e/03-offering-supported-sources.spec.ts \
  --headed --project=chromium --debug
```

The Playwright Inspector lets you step through actions and inspect locators against the live page.
