# Stack baseline — what's already wired in `web/`

Snapshot of the existing dogwalk web app. Verify against current code if it's been > a few days; package.json drifts.

## Runtime + tooling

- **Next.js 14.2.x** — App Router, served on port 3030 (`pnpm --filter @petwalker/web dev`).
- **React 18.3 / React DOM 18.3.**
- **TypeScript 5.5.** `strict: true` in `web/tsconfig.json`.
- **pnpm 9** workspaces + **Turborepo 2** at the repo root.
- **Node ≥ 20.11** (engines).
- **Playwright** for e2e (`web/e2e/`).
- **ESLint 8** + `eslint-config-next` + `@typescript-eslint`.

## Wired libraries (already in `web/package.json`)

| Library | Purpose | Notes |
|---|---|---|
| `aws-amplify` v6 + `@aws-amplify/auth` v6 | Auth (Cognito) | Configured in providers.tsx; reuse |
| `@tanstack/react-query` v5 | Server state | Use everywhere instead of raw fetch in components |
| `i18next` + `react-i18next` + `i18next-browser-languagedetector` | i18n | locales in `web/src/i18n/locales/` |
| `react-virtuoso` | List virtualization | For heavy lists (provider search, messages, earnings) |
| `lucide-react` | Icons | Single source of truth for icons |
| `sonner` | Toasts | Bottom-center on mobile, bottom-right on desktop per brief |
| `tailwindcss` 3.4 | Styling | Content scope: `./src/**/*.{ts,tsx}` |
| `autoprefixer` + `postcss` | CSS pipeline | Don't touch unless adding a Tailwind plugin |
| `@petwalker/shared` (workspace) | Shared types/utils with API and mobile | Check there before redefining a type |

## NOT yet wired (add only when a milestone asks for it)

- **Mock API layer** — neither MSW nor `app/api/_mock/` exists yet. M1 should choose one and wire it.
- **Mapping library** — no Mapbox/Google. Use the `<MapPlaceholder>` stub until the M-Maps phase decides.
- **Stripe Elements wrapper** — no Stripe React SDK yet. Add when M3 gets to the Payment Methods sheet.
- **Rich text editor** — none. The brief never asks for one.
- **Form library** — none. Stay on native React state + Zod schema if needed.
- **Date utility (date-fns/dayjs)** — none. Use `Intl` until proven insufficient (e.g. when the Schedule Builder lands in M4).
- **Charting library** — none. Earnings dashboard (M4) will need Recharts; add at that point.
- **Animation library** — none. Tailwind transitions + CSS keyframes are enough until proven otherwise.
- **`@axe-core/playwright`** — not yet wired. Add when the first M3 PR ships its a11y smoke spec.

## File layout (current)

```
web/
  src/
    app/
      (app)/                ← signed-in route group
        bookings/{page, [id], recurring}
        messages/page
        pets/{page, new, [id]}
        providers/{page, [id]}
        favorites/page
        feed/page
        me/{page, favorites}
        profile/{page, layout, personal, preferences, security, provider, finances}
        layout.tsx          ← App Shell (Header + BottomTabBar + Footer)
      (auth)/               ← unauthenticated route group
        sign-in, sign-up, confirm
        layout.tsx
      page.tsx              ← root landing
      layout.tsx            ← html/body, fonts, providers
      providers.tsx         ← QueryClient, i18n, ViewMode, Toast root
      globals.css           ← tokens (CSS vars) + Tailwind directives
    components/
      ui/{button, field, spinner, skeleton, error-state, confirm-dialog}.tsx
      profile/{account, offerings, language, currency, security, stripe, card}-section.tsx
      <many feature components>.tsx
    contexts/
      view-mode-context.tsx       ← Owner/Provider toggle
      notifications-context.tsx
    hooks/                  ← shared hooks
    lib/                    ← formatters, helpers
    i18n/
      locales/              ← en/ru/es/zh/he JSON
  e2e/                      ← Playwright specs
  tailwind.config.ts
  next.config.mjs
  postcss.config.cjs
  playwright.config.ts
  package.json
```

## Existing primitives — extend before duplicating

Look here first when a screen needs a primitive:

- `components/ui/button.tsx` — variants, sizes
- `components/ui/field.tsx` — label + input + helper + error
- `components/ui/spinner.tsx` — small in-button spinner
- `components/ui/skeleton.tsx` — list-row skeleton
- `components/ui/error-state.tsx` — full-page error block
- `components/ui/confirm-dialog.tsx` — destructive action confirmation

If a primitive almost matches but you need a new variant, add a variant prop instead of forking.

## Envs the app cares about

From `turbo.json`:

- `NEXT_PUBLIC_API_URL` — backend base URL
- `NEXT_PUBLIC_USE_MOCKS` — **add this** to gate the mock layer (Phase 5)
- Cognito: `COGNITO_*`
- Stripe: `STRIPE_*`

When you add a new env, extend `globalEnv` in `turbo.json` so Turborepo invalidates the cache when it changes.
