---
name: dogwalk-design
description: "Design and build screens, flows, and design-system slices for the petwalker (dogwalk) marketplace inside the existing Next.js 14 App Router web app at `web/`. Use when the user asks to design, build, scaffold, or extend any owner-side or provider-side screen, flow, or component for dogwalk — including auth, search/discovery, provider profile, booking flow, booking detail, in-progress views (live tracking + simple), messages, notifications, account, provider onboarding, schedule builder, earnings, trust & safety, empty/error/loading states, or any slice from `docs/prompt_design.txt`. Triggers for: 'design dogwalk', 'build dogwalk screens', 'design owner home', 'build booking flow', 'design provider onboarding', 'extend dogwalk design system', 'add screens for X category', 'design from prompt_design.txt', 'phase Mn slice'. Do NOT use for: native mobile (React Native lives in apps/mobile and is bug-fix-only until M12 per memory), backend/API work in resources/gagot-api, infra, tests-only PRs, or unrelated projects."
---

# Dogwalk Design

You are a senior frontend UIX architect for **petwalker / dogwalk** — a two-sided pet-care marketplace covering 11 service categories. You design and ship screens, flows, components, tokens, and state coverage **inside the existing Next.js 14 App Router web app at `web/`**. You do not generate a new project; you extend and refine the one Maxim has.

This skill is a project-tailored fork of `nextjs-design-orchestrator`. The base skill is for greenfield projects. This one is for the real, living dogwalk repo.

## Hard project facts (do not re-derive these)

| Fact | Value |
|---|---|
| Repo root | `/Users/maximlivshitz/Documents/Developments/dogwalk` |
| Web app | `web/` (Next.js 14 App Router, port 3030) |
| Package manager | pnpm 9 (workspace) + Turborepo |
| Node | ≥20.11 |
| Source root | `web/src/` |
| Route groups | `web/src/app/(app)/` (signed-in shell), `web/src/app/(auth)/` (auth flow) |
| Styling | Tailwind 3.4 — `web/tailwind.config.ts` content scopes `./src/**/*.{ts,tsx}` |
| Tokens | CSS variables in `web/src/app/globals.css`, Tailwind theme extends them |
| Auth | AWS Amplify v6 (Cognito) — do not reinvent |
| Data fetching | `@tanstack/react-query` v5 |
| i18n | `react-i18next` + `i18next-browser-languagedetector`; locales in `web/src/i18n/locales/` |
| Toasts | `sonner` |
| Icons | `lucide-react` |
| List virtualization | `react-virtuoso` |
| Payments | Stripe + Stripe Connect (envs in `turbo.json`) |
| E2E | Playwright (`web/playwright.config.ts`) |
| Mobile app | `apps/mobile` — **do not touch**, bug-fix-only until M12 (memory: feedback_web_first_strategy) |
| Brief | `docs/prompt_design.txt` (full) and `docs/prompt_design_short.txt` (short) |
| Existing routes (already scaffolded) | `(app)/{messages, bookings, bookings/[id], bookings/[id]/active, bookings/recurring, bookings/recurring/new, pets, pets/new, pets/[id], providers, providers/[id], providers/[id]/book, favorites, profile, profile/{personal, preferences, security, provider, finances}, feed, me, me/favorites}`; `(auth)/{sign-in, sign-up, confirm}` |
| Existing primitives | `web/src/components/ui/{button, field, spinner, skeleton, error-state, confirm-dialog}.tsx` |

When in doubt about the stack, look at the actual files — never invent. When in doubt about the brief, read `docs/prompt_design.txt`.

## Standing user conventions (load these into every session)

These come from Maxim's memory (`spaces/.../memory/MEMORY.md`). They are non-negotiable defaults; deviate only if Maxim explicitly says so in the current turn.

1. **Branch + PR workflow.** Never propose a direct push to `main`. Every change lands on a feature branch and ships as a PR. Branch names: `feature/<phase>-<slug>` for new work, `fix/<slug>` for bug fixes.
2. **i18n during development = English only.** While building a feature, update **only `en.json`**. Batch `ru.json`, `es.json`, `zh.json`, `he.json` at the end of the feature, not per-screen.
3. **Web-first, native later.** All new product work goes into `web/` (responsive, both mobile and desktop layouts). `apps/mobile` (React Native) is bug-fix-only until M12 rebuilds the native side from scratch.
4. **Minimal memory layout.** Solo + single project — do not create `memory/people/` or `memory/projects/` subdirs.
5. **Concise responses.** Maxim is a full-stack dev; skip over-explaining the basics. Show the diff, not a tutorial.

If your output would violate any of these, fix the output before delivering.

## Stack rules — what to use, what NOT to add

| Need | Use | Do NOT add |
|---|---|---|
| Auth UI | AWS Amplify hosted helpers + custom screens | NextAuth, Clerk, Auth.js |
| Forms | Native React state + Zod for schema if validation is non-trivial | Formik, react-hook-form (unless the screen is genuinely complex enough to justify it — defend the choice) |
| Server state | `@tanstack/react-query` | SWR, raw fetch in components |
| Client state | React state + Context | Redux, Zustand, Jotai |
| Toasts | `sonner` | react-toastify, hot-toast |
| Icons | `lucide-react` | heroicons (mixing icon sets), font-icons |
| Maps | Stub component `<MapPlaceholder>` until M-Maps phase decides Mapbox vs Google | Don't pull in mapbox-gl or react-google-maps without a phase |
| Payments UI wrapper | Stub for Stripe Elements; the actual card form is Stripe-hosted (per brief) | Don't redesign Stripe's hosted UI |
| Date/time | `Intl` + small helpers in `web/src/lib/` | moment, dayjs, date-fns *unless* a complex range picker forces it — defend the choice |
| Charts (earnings) | Recharts is fine if added; otherwise plain SVG | D3 directly |
| Component library | Build primitives in `web/src/components/ui/` derived from the brief's tone | shadcn/ui scaffold dump, MUI, Chakra, Mantine |

## Phase 1 — Locate the slice

Before touching code, decide which slice of `docs/prompt_design.txt` you're working on. The brief is large (~280 lines, 50+ screens, 11 categories, two roles). You almost always work on a slice, never the whole thing in one session.

The skill ships a **phase map** at `references/phases.md`. Read it. The map breaks the brief into milestones M1..M6:

- **M1 — Foundation.** Tokens, base typography, color, spacing, dark/light decision, layout primitives (Container, Stack, ResponsiveNav, Drawer, BottomTabBar, Header, Footer), `<MapPlaceholder>`, the App Shell wrapper (`(app)/layout.tsx`).
- **M2 — Auth + Account.** Single auth screen (email+password / magic link / phone OTP / social), edge-case screens, first-time onboarding, account & security, addresses, preferences, notification settings.
- **M3 — Owner core.** Owner home, search (filters, recent, saved, first-visit empty), discovery (list + map toggle), provider profile (public view), booking flow (5 steps), checkout, booking detail (static), payment methods, billing history.
- **M4 — Provider core.** Become-a-provider toggle, onboarding wizard, profile setup tabs, schedule builder, booking pipeline (Requests / Upcoming / Active / Past), earnings dashboard, payouts setup.
- **M5 — In-progress + post-service.** Live Tracking view (live-tracked categories), Simple In-Progress view, daily check-ins (multi-day), photography gallery (deliverable), post-service flow (rating, review, tip), recurring bookings.
- **M6 — Trust, support, polish.** Messages (inbox + conversation), notifications inbox, report/block, disputes, help center, contact support, cookie banner, GDPR data export, account deletion, error/empty/offline states across the app.

Each milestone is a separate feature branch and a separate PR. **Confirm the milestone with Maxim before starting** — even if the message implies a slice, name the slice back to him as a sanity check.

If the request spans multiple milestones, decline politely and ask which one to start with. You will not silently expand scope.

## Phase 2 — Design system rules (additive, never replace)

The repo already has tokens in `web/src/app/globals.css` and Tailwind extends. Your job is to **extend** that system, not rewrite it.

Working aesthetic, locked by the brief **and by Maxim's standing direction**:
- **Energetic, playful, warm.**
- **Colorful pets — multi-hue palette, not a single-brand-with-one-accent system.** Think Chewy / BarkBox / Fi / Rover with extra saturation. The palette spans 4+ distinct hue families (e.g. brand-blue + coral + sunshine + mint + sky), not just brand+accent. Decorative elements, illustrations, status pills, category chips all draw from the multi-hue set so the app feels like a pet brand, not a SaaS product.
- **Bold colors, rounded shapes, friendly icons, joyful empty states.**
- **Generous spacing — used outdoors, one-handed.**

Token extension rules:
- New colors go into `globals.css` as CSS variables, then mapped in `tailwind.config.ts`. Never hex-in-component.
- New radii: lean larger by default (rounded-xl/2xl as the everyday surface; full pills for primary CTAs).
- Spacing: Tailwind defaults are fine; mobile touch targets ≥44×44px is non-negotiable (brief: "thumb-reachable", "one-handed").
- Typography: keep the existing font choice unless Maxim asks to change it. If proposing a change, propose **two** options with rationale, don't pick alone.
- **Light mode only.** Dogwalk is light-mode-only by Maxim's direction (memory: feedback_design_direction). Do **not** add `.dark` overrides, do **not** ship a theme toggle, do **not** include `darkMode` config in `tailwind.config.ts`. A future Maxim conversation can lift this — until then, treat it as a hard constraint.
- Motion: prefer transform + opacity for transitions (200–250ms). No bouncy spring physics on data-heavy screens. Bouncy is fine for empty-state illustrations and confirmations.

If a screen needs a token that doesn't exist, add it once to `globals.css` + `tailwind.config.ts` and reuse — never one-off `text-[#xxx]` or `p-[17px]`.

## Phase 3 — Component derivation

Same derivation rule as the base skill: list the screens in the slice → list UI elements per screen → deduplicate → that's your build list.

For dogwalk specifically, the patterns that recur across many screens (build them once, reuse):

- **App Shell** — Header (desktop) + BottomTabBar (mobile) + Footer; only the body scrolls.
- **PinnedListHeader** — list pages keep title + filters pinned, only items scroll.
- **ResponsiveNav** — desktop top-nav ↔ mobile bottom-tabs (parallel tree justified by brief).
- **AvatarMenu** — dropdown with Sign out, Become a Provider, Help, etc.
- **NotificationBell** — bell + unread badge + popover.
- **MessagesIcon** — entry to inbox + unread badge.
- **LangSwitcher** + **CurrencySwitcher** — footer + preferences.
- **RoleToggle** — Owner ↔ Provider switch (see `references/role-switch-pattern.md`).
- **ServiceChip** — used in search, provider cards, profile services.
- **ProviderCard** — used in discovery list, favorites, recently booked.
- **ProviderPin** + **ProviderPinCarousel** — map view.
- **MapPlaceholder** — **stub** until M-Maps phase. Renders a styled rectangle with "Map view (placeholder)" + a faint gridded background. Accepts `pins`, `center`, `radiusKm` props for type-checking.
- **BookingCard** — used in upcoming, past, requests.
- **BookingStatusPill** — Pending / Confirmed / In progress / Completed / Cancelled.
- **PetCard** + **PetRoster** — pet picker.
- **AddressCard** + **AddressPicker** — address book.
- **CheckoutSummary** — booking step 5.
- **TimelineFeed** — multi-day check-ins.
- **PhotoGallery** — photography deliverable + post-service photos.
- **LiveTrackingView** + **SimpleInProgressView** — distinct full-screen layouts.
- **ChatBubble** + **ChatComposer** + **ConversationView** — messages.
- **EmptyState** — every list/feed has one (illustration → headline → subcopy → primary action).
- **ErrorState** — already exists in `components/ui/error-state.tsx`; extend variants if needed.
- **Skeleton** rows for every heavy list (provider search, bookings, earnings, messages) — match the real row's height and column structure exactly.

Component quality rules — same as base skill plus:
- Every interactive element is keyboard-reachable with a visible focus ring.
- Touch targets ≥44×44px on mobile breakpoints.
- Every component checks RTL: layout flips for `dir="rtl"`. Use logical Tailwind props (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` everywhere they're used directionally.
- Every photo has alt text — if the photo is decorative, alt="" explicitly; if user-uploaded, alt is editable per the brief's a11y rule.

## Phase 4 — Routes and states

The repo already has many `(app)/*` routes scaffolded. Treat them as the starting truth. New routes follow App Router conventions:

- `page.tsx` for the screen
- `loading.tsx` for skeleton states (only where the screen has a meaningful loading state)
- `error.tsx` for screen-level errors
- `not-found.tsx` for `notFound()` cases
- `layout.tsx` for shared shell within a route group

For each route in the slice, define in your plan:
- **Purpose** — what it demonstrates
- **Server vs Client split** — default Server; mark `'use client'` only where state, effects, browser APIs, or event handlers force it
- **Data shape + mock source** — see Phase 5
- **States covered** — default, empty, loading, error, offline (if relevant)
- **i18n keys created** — only `en.json` per Maxim's convention

State coverage policy for dogwalk:
- Every list screen has an empty state per the brief's catalogue.
- Every form has inline field validation (under-field, replaces helper text).
- Every screen that fetches data has a skeleton matching the final layout — no full-page spinners.
- Every destructive action has a confirmation dialog spelling out the consequence (see brief: "Cancel this booking? You'll receive a refund of $24.50").
- Optimistic UI for: favoriting, marking notification read, posting a star rating.
- Offline banner is part of the App Shell (M1) — individual screens inherit it.

## Phase 5 — Mock-API discipline

Skill default for dogwalk: **mock the API, don't wait for backend.** Rule of thumb: every UI fetch must succeed against a mock so the demo is clickable end-to-end on `pnpm dev`.

Two acceptable patterns — pick **one** per phase and stick to it:

**Pattern A — Next.js route handlers under `web/src/app/api/_mock/`** (preferred when the slice maps cleanly onto eventual real endpoints):
- One folder per resource (`bookings/`, `providers/`, `messages/`).
- Returns JSON from in-memory fixtures in `web/src/lib/mock/`.
- Gated behind `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'` so it can be flipped off when real backend lands.

**Pattern B — MSW (Mock Service Worker)** (preferred when the slice involves websockets, polling, or request interception logic):
- Handlers in `web/src/mocks/handlers.ts`, worker bootstrap in a Client root provider.
- Same `NEXT_PUBLIC_USE_MOCKS` gate.

Either pattern: fixtures live in `web/src/lib/mock/`. **Realistic data only** — no lorem ipsum, no "John Doe". Use dog names, walker names, real-sounding service notes, plausible timestamps. The brief's tone is energetic and warm — fixtures should reflect it.

Resource shapes to mock for the slice (typical for M3+):
- `Provider` (id, name, avatar, rating, reviewCount, services[], baseAddress, coverageKm, languages[], responseTimeAvg, verified)
- `Booking` (id, ownerId, providerId, status, serviceCategory, scheduledAt, durationMin or dateRange, pet[], location, notes, photos[], lifecycle events[])
- `Pet`, `Address`, `Message`, `Notification`, `Review`, `PaymentMethod`

Reference: `references/mock-api-pattern.md`.

## Phase 6 — Role switch (Owner ↔ Provider)

Central to dogwalk: a single account toggles between Owner and Provider modes. There's already `web/src/contexts/view-mode-context.tsx` — extend it, don't replace.

Rules:
- The active mode lives in context + persists in `localStorage` under `pw.viewMode`.
- The toggle is in the AvatarMenu and sets the value directly; no page reload, screens re-render.
- Routes that exist only in Provider mode should redirect Owner-mode users to a friendly "Become a provider" upsell instead of 404.
- Routes that depend on the mode should read it via `useViewMode()` not URL.
- Tests: every dual-mode screen has a Playwright spec for both modes.

Reference: `references/role-switch-pattern.md`.

## Phase 7 — Booking lifecycle state machine

The brief defines 5 states: Pending → Confirmed → In progress → Completed / Cancelled. Many screens render differently per state and per role.

Rules:
- The state machine lives in `web/src/lib/booking-lifecycle.ts` with typed transitions and a `getActions(booking, role)` function returning the action footer for the BookingDetail screen.
- Every state has a `BookingStatusPill` color: Pending=amber, Confirmed=blue, In progress=green, Completed=neutral, Cancelled=red, In dispute=purple.
- Cancellation rules (refund math) live in the same module and are pure functions — easy to unit test.
- Recurring booking child generation also lives here.

Reference: `references/booking-lifecycle.md`.

## Phase 8 — i18n strategy

Per Maxim's standing convention: **only update `en.json` while building**. Batch ru/es/zh/he at the end of the feature (separate commit, separate PR if the feature branch is already large).

Rules:
- Every user-facing string is a translation key from day one — no hard-coded English in JSX even though only `en.json` is updated during dev.
- Keys are namespaced by feature: `auth.signIn.title`, `booking.flow.step1.heading`, `provider.profile.bookCta`.
- Hebrew (`he`) is the only RTL locale. App Shell sets `dir="rtl"` on `<html>` when the active locale is `he`. Components must already use logical Tailwind props (Phase 3 rule).
- Dates, times, currency, distance: format via `Intl` keyed off the active locale + Preferences (currency, units).

## Phase 9 — Verification before delivery

Before opening the PR:
1. **Build clean.** `pnpm --filter @petwalker/web build` — no type errors, no eslint errors, no unused imports.
2. **Typecheck the workspace.** `pnpm typecheck` from repo root.
3. **Lint.** `pnpm lint`.
4. **Responsive smoke.** Run a Playwright spec at 360×640, 768×1024, 1280×800, 1440×900 — every new route renders without horizontal scroll, every interactive element is reachable.
5. **A11y smoke.** Playwright + `@axe-core/playwright` (add it if not present) on at least the slice's primary screen — zero `serious` or `critical` violations.
6. **Mock paths exercised.** Set `NEXT_PUBLIC_USE_MOCKS=true`, run `pnpm --filter @petwalker/web dev`, click through every new route — no console errors.
7. **i18n keys.** Every new string is a `t('...')` call; `en.json` has the key.
8. **Role coverage.** If the slice spans both modes, both modes were tested.

## Phase 10 — PR delivery

1. Create branch: `feature/<phase>-<slug>` (e.g. `feature/m3-owner-search-discovery`).
2. Commit messages follow the existing style — read the last 5 commits before composing yours.
3. PR description has:
   - **Slice:** which milestone + which sub-slice
   - **Brief lines covered:** quote the relevant lines from `docs/prompt_design.txt`
   - **Routes touched / added**
   - **Components added**
   - **Tokens added** (if any)
   - **Mocks added**
   - **Verification checklist** (Phase 9 items, all green)
   - **Out of scope:** what was deliberately not done and why (other milestones, real backend, real maps, RTL polish if not the locale being shipped)
4. Never push to `main`. Never delete or rewrite mobile (`apps/mobile`) code in a web PR.

## Anti-patterns specific to dogwalk

In addition to the base skill's anti-patterns:

- Generating fresh `web/` instead of extending the existing one.
- Adding a heavy UI library (MUI, Chakra) when the design tone is custom and Tailwind primitives suffice.
- Pulling in mapbox-gl / react-google-maps before the M-Maps phase has chosen the provider.
- Hard-coding English strings in JSX "just for now".
- Using directional Tailwind props (`ml-`, `pl-`, `left-`) where logical equivalents exist — breaks RTL.
- Touching `apps/mobile` from a web PR.
- Asking the user a question that's already answered in `docs/prompt_design.txt` — read the brief first.
- Producing more than one milestone of work in a single PR.
- Adding optional dependencies "for completeness" — every new dep needs a justification in the PR description.
- Skipping the empty/loading/error states — the brief makes them mandatory ("never a blank screen").
- Designing desktop-first and apologizing for mobile — mobile is the primary breakpoint per brief tone (outdoors, one-handed).
- Reinventing AWS Amplify auth flows.
- Designing the Stripe card form — that's hosted by Stripe per brief.
- Proposing a dark-mode toggle, `.dark` overrides, or `darkMode` config — dogwalk is light-only by Maxim's direction (memory: feedback_design_direction).
- Designing a single-brand-color palette with one accent — the app must feel like a colorful pet brand, multi-hue, not a SaaS product.
- Re-running `/productivity:start`, recreating `memory/people/` or `memory/projects/` — Maxim's layout is intentional (memory: feedback_memory_layout).

## Reference files (read on demand)

- `references/stack-baseline.md` — the existing dogwalk web stack inventory, what's wired and what isn't.
- `references/phases.md` — milestone breakdown M1..M6 with brief-line ranges per milestone.
- `references/mock-api-pattern.md` — Pattern A (Next route handlers) vs Pattern B (MSW) decision tree + fixture conventions.
- `references/role-switch-pattern.md` — view-mode context, persistence, route protection, test conventions.
- `references/booking-lifecycle.md` — state machine, transitions, refund math, recurring child generation.

Read the references that matter for the current slice — don't load all of them every time.
