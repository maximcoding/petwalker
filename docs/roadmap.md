# Roadmap

> Dependency-ordered implementation roadmap. Each milestone unblocks the next.
> See [`architecture.md`](./architecture.md) for the system as it stands today.

Legend: **P0** blocker · **P1** must · **P2** should · **P3** later

---

## Status snapshot

Last verified against code: 2026-05-10.

| Milestone | Status |
|---|---|
| Foundation (monorepo, infra, shared, db) | Shipped |
| M1 · Auth + skeletons | Shipped |
| M2 · Core marketplace (profiles, pets, providers, bookings) | Shipped |
| M3 · Active walk — tracking + chat | **Partial** — gateways + chat shipped; missing POST walk start/end + mobile background GPS |
| M4 · Stripe payments | Shipped |
| M5 · Reviews + push | Shipped |
| _Bonus_ · Calendar OAuth + recurring bookings + web notifications + profile expansion | Shipped (not in original M plan) |
| M6 · CI / observability / AWS deploy | Planned |
| M7 · Pro-tool differentiation (voice reports, off-platform calendar, tax export, intro video) | Planned |
| M8 · Trust & safety (optional insurance, AI vision soft-warn, safety score, verified check-in) | Planned |
| M9 · Multi-provider payments (own payment-methods table, provider abstraction, PayPal/Payoneer) | Planned |
| M10 · User profile expansion (address book, account status, birth date, preferences split) | Planned |
| M11 · UX resilience (empty/error/loading states, offline) — web only | Planned |
| M12 · Native mobile rebuild (Expo/RN from scratch after web stabilises) | Planned |
| M13 · Search & discovery polish (sort, map view, languages, saved searches, multi-pet booking) | Planned |
| M14 · Trust, safety & moderation (report, block, auto-pause, credential verification + badges) | Planned |
| M15 · Compliance (cookie banner, GDPR export, account deletion, age verification) | Planned |
| M16 · Help & support (Help Center, in-app support chat, status indicator) | Planned |
| M17 · Promotions (promo codes, referral program, tipping rollout) | Planned |
| M18 · Provider onboarding wizard (6-step UX with progress, video resume, resumable) | Planned |

The per-milestone task lists below are kept verbatim as the original planning artifacts. Sub-items aren't actively re-checked when work ships — treat them as "what we set out to build" snapshots rather than a live tracker. Historical artifact: M2–M5 task lists use the original "walker" wording; the codebase generalised this to "provider" once non-walking categories (vet, grooming, etc.) landed. The terms refer to the same modules and routes (`ProvidersModule`, `/providers`, etc.).

---

## Shipped beyond the original milestones

Work that landed between M5 and the next planned milestone, recorded here so it's not invisible to future planning.

**Calendar OAuth (replaces the iCal feed plan)**
- [x] Google OAuth via Cognito federated identity provider
- [x] `google_oauth_tokens` table + Drizzle migration 0015
- [x] `GoogleTokensService` with refresh logic
- [x] `CalendarSyncService` switched from iCal polling to `freebusy.query` every 30 min
- [x] Webhook + status/disconnect endpoints
- [x] Web: Connect Google button on `/profile/provider`
- [x] Legacy `calendar_feeds` iCal path deprecated

**Recurring bookings**
- [x] `recurring_series` table + `bookings.recurring_series_id` FK column
- [x] `RecurringSeriesModule` + service + controller
- [x] Web: recurring booking form (date range + multi-time-per-day)
- [x] Mobile: recurring series in booking flow

**Web in-app notifications (in addition to mobile push)**
- [x] `WebNotificationsGateway` (WebSocket)
- [x] `web_notifications` table
- [x] `NotificationBell` component in app header

**Profile expansion (Phase 1–4)**
- [x] Tabbed `/profile` (Personal, Provider, Account & security, Finances) + UserMenu in nav
- [x] `users.about_me` + `users.preferred_currency` columns + Drizzle migration
- [x] Payment methods section (add card via Stripe Elements, remove, set default)
- [x] Billing history with paginated query + invoice PDF download
- [x] Display preferences (language, currency, units) consolidated into UserMenu
- [x] View-mode toggle (Owner ↔ Provider) gating provider-only profile surfaces
- [x] Searchable service picker, filter panel redesign, recent-searches polish

**Favorites (saved providers)**
- [x] `favorites` table + Drizzle schema
- [x] `FavoritesModule` + service + controller (`/favorites` CRUD)
- [x] Web `/favorites` page; heart toggle on provider cards & profile

**M3 leftovers (still partial)**
- [ ] `POST /walks/:bookingId/start` — only GET shipped today
- [ ] `POST /walks/:walkId/end`
- [ ] Provider arrival ping `POST /walks/:walkId/arrive` (the "I'm here" button — was in original M3 plan, never built)
- [ ] Walk summary fields on `walks` (`summary_text`, `summary_photos[]`, `arrived_at`)
- [ ] Mobile background GPS via `expo-task-manager` (`expo-location` is imported but no background task registered) — **deferred to M12** per web-first strategy

The first four are the smallest blocker on calling M3 fully shipped — one PR closes them. Background GPS task waits for M12.

---

## Up next (immediate pickup point)

The pickup order, smallest-to-biggest scope:

1. **Close M3 leftovers (small).** Add `POST /walks/:bookingId/start`, `POST /walks/:bookingId/arrive` ("I'm here"), and `POST /walks/:walkId/end` (with required walk-summary fields), so the active-walk flow is launchable from web (the gateway + GET endpoint already exist). Mobile background GPS task moves to M12. ~1 PR.
2. **M7.1 — Off-platform clients in provider calendar.** Largest stickiness gain per line of code. Drizzle migration `0016_provider_external_bookings.sql` (provider_id, client_name, scheduled_at, duration_min, notes, address_text, …). Backend `ProviderExternalBookingsService` + controller (CRUD under `/me/external-bookings`). Wire into `BookingAvailabilityService` so external rows block platform slots. Shared `ProviderExternalBooking` type + DTO + API client. Web section on `/profile/provider` with list + Add/Edit modal. en.json only.
3. **M11.1 — Backend ErrorCode + request-ID** (foundation for the rest of M11). `ErrorCode` enum in shared, every HttpException references one, request-ID middleware so client logs match server. Unblocks the web error-state polish and the eventual mobile rebuild.
4. **M11.2 — Web `error.tsx` / `loading.tsx` / `not-found.tsx` + `<EmptyState>` + `<HeavyList>`.** Replace inline empties and bare error fallbacks across pages.
5. **M7.2 — Tax export.** Reuses the invoice-PDF generator already shipped. CSV/PDF per year, Finances tab download button.
6. **M7.3 — Voice walk reports** (needs OpenAI key — see Pending business decisions).
7. **M7.4 — Intro video on profile** (S3 prefix + UI player).

Each line above is independently shippable as its own PR.

---

## Pending business decisions

- **Platform fee.** Currently 15% in code (`bookings/cancellation-policy.ts` + `payments.service.ts`) and in `pitch.md` / `product-brief.md`. Recommendation per anti-Rover review is 10–12% (still below Rover's 15–20% but unit economics survive). 7–8% is aggressive and unproven. Decision blocks: `pitch.md` rewrite, the two constants in code, marketing copy. Mechanical change once the number is picked.
- **Google Cloud OAuth credentials.** The Calendar Connect button shows a yellow "not configured" notice until `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` + `GOOGLE_OAUTH_REDIRECT_URI` are set in `backend/.env`. Setup: <https://console.cloud.google.com/apis/credentials>. Full walkthrough: [`google-calendar-setup.md`](./google-calendar-setup.md).
- **OpenAI API key.** Required for M7.3 voice walk reports. Not blocking until M7.3 starts.

---

## Outstanding tracks (parallel to milestones)

- **i18n batch translation.** Per repo rule, only `en.json` is updated while building; `ru/es/zh/he` get batched at feature-set boundaries. Pending batches: IA refactor strings, Google Calendar strings, recurring-bookings strings, M7 strings as they ship. Worth one focused pass before any external demo / beta.
- **Stripe real keys.** Backend factory transparently picks `StripeRealService` vs `StripeDevService` based on `STRIPE_SECRET_KEY` presence. Dev mock works end-to-end including webhooks via in-process EventEmitter. Real keys needed only for: real Apple/Google Pay testing, beta users, demo. See [`payments.md`](./payments.md).
- **Production hardening.** Listed in M6: pino + OpenTelemetry, raw-body Stripe webhook verification, idempotency persistence, etc. Don't tackle until something else makes deploy concrete. Some of this overlaps with M11 backend hardening (rate-limit, webhook idempotency in Redis) — done there first.
- **Mobile IA parity.** No longer a parallel track — the existing `apps/mobile` is bug-fix-only per the web-first strategy and gets fully rebuilt in M12. Don't add new screens or pattern work to the Expo app.

---

## Foundation (done)

- [x] Monorepo (pnpm + turbo, base tsconfig, root tooling)
- [x] Infra (docker-compose: postgres + redis + pgadmin, extensions init)
- [x] `shared` package — enums, types, classes, dto, api client (SSOT for contracts)
- [x] Drizzle inside `backend/src/db` — schemas, client, migrate, seed
- [x] SSOT discipline — pgEnum imports value lists from `@petwalker/shared/enums`; row types suffixed `Row`

---

## M1 · Foundation — auth + skeletons   (P0)

Goal: every client can sign in **directly with Cognito**, then hit `GET /auth/me` on our backend with the resulting Bearer token and get a typed `User` back.

> **Auth boundary, locked.** Backend never implements sign-up, sign-in, confirm, refresh, sign-out, password reset, MFA. All of it is client-side against Cognito (Amplify Auth or amazon-cognito-identity-js). Backend only verifies JWTs and serves authorized calls.

**Backend**
- [ ] `main.ts` — `NestFactory.create(AppModule, FastifyAdapter)`
- [ ] `ConfigModule` — env validation with zod (DATABASE_URL, COGNITO_*, STRIPE_*, REDIS_URL …)
- [ ] `AppModule` wiring + global pipe (`ZodValidationPipe`) + global filter (`HttpExceptionFilter`)
- [ ] `DatabaseModule` — provides `DRIZZLE_DB` token from `createDb()`
- [ ] `HealthController` — `GET /health` checks db + redis
- [ ] `AuthModule` — `CognitoGuard` using `aws-jwt-verify`, `AuthService.upsertUser()` syncs cognito_sub → users row
- [ ] `GET /auth/me` returns `User` from `@petwalker/shared`

**Web** (`apps/web`)
- [ ] Next.js 14 App Router, Tailwind, shadcn/ui (or pick a UI lib)
- [ ] Cognito auth via Amplify Auth or Hosted UI redirect
- [ ] `(auth)` group: sign-in, sign-up, confirm
- [ ] `(app)` protected layout — reads token, renders shell
- [ ] `lib/api.ts` — `new PetwalkerApi({ baseUrl, getToken })` from `@petwalker/shared`
- [ ] `/me` page — calls `api.auth.me()`

**Mobile** (`apps/mobile`)
- [ ] Expo + expo-router scaffold
- [ ] Cognito via `amazon-cognito-identity-js` (or Amplify Auth)
- [ ] `(auth)/sign-in`, `sign-up`, `confirm` screens
- [ ] `(tabs)` shell — home / bookings / chat / profile placeholders
- [ ] `lib/api.ts` mirroring web

---

## M2 · Core marketplace — profiles, pets, walkers, bookings   (P1)

Goal: an owner can find a walker, book a walk, both see it in their lists.

**Backend modules**
- [ ] `UsersModule` — `PATCH /users/me`, `GET/PUT /users/me/walker-profile`
- [ ] `PetsModule` — `GET/POST/PATCH/DELETE /pets`, owner-scoped
- [ ] `WalkersModule` — `GET /walkers?lat&lng&radiusKm` with bbox SQL prefilter + Haversine in TS
- [ ] `BookingsModule` — `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status` with state-machine guards

**Web pages**
- [ ] `/pets` list + `/pets/new` + `/pets/[id]`
- [ ] `/walkers` browse + `/walkers/[id]` profile + booking modal
- [ ] `/bookings` (split owner / walker view by role)
- [ ] `/profile` (with walker-profile editor when role includes walker)

**Mobile screens**
- [ ] Pet list + add/edit
- [ ] Walker browse (list + map preview)
- [ ] Booking flow (date/time picker, pet picker, walker)
- [ ] Bookings tab (today / upcoming / past)

---

## M3 · Active walk — tracking + chat (WS)   (P2)

Goal: walker hits "start", owner sees a live map and can chat.

**Backend**
- [ ] `WalksModule` — `POST /walks/:bookingId/start`, `POST /walks/:walkId/end`
- [ ] `TrackingGateway` (`/ws/tracking`) — auth via Cognito JWT, room = `walk:{id}`, Redis pub/sub fanout, batch persist GPS pings (every N seconds)
- [ ] `ChatGateway` (`/ws/chat`) — room = `booking:{id}:chat`, Redis fanout, persist on send
- [ ] `MessagesModule` — REST history (paginated), called by WS clients on join

**Mobile**
- [ ] Background GPS during active walk (`expo-location`, `expo-task-manager`)
- [ ] Active-walk screen — `MapView` + walker pin + path; walker has "I'm here" + "End walk" buttons
- [ ] Chat tab per booking, threaded list

**Web**
- [ ] Owner active-walk view — read-only map polling/WS + chat
- [ ] Chat UI mirror

---

## M4 · Money — Stripe Connect + PaymentIntents   (P2)

Goal: owner pays at booking confirm, walker gets payout.

**Backend**
- [ ] `PaymentsModule`
  - [ ] `POST /payments/connect/onboard` — Stripe Account Link for Express onboarding, returns URL
  - [ ] `POST /payments/intent` — create PaymentIntent with `application_fee_amount` and `transfer_data.destination = walker.stripe_account_id`
  - [ ] `POST /payments/webhook` — handles `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] On `payment_intent.succeeded` → flip booking status guard to allow `confirmed`
- [ ] Refund flow on cancellation (within window)

**Web**
- [ ] Walker `/onboarding/stripe` page — kicks off Connect link
- [ ] `/bookings/[id]/pay` — Stripe.js Elements, confirms PaymentIntent
- [ ] Walker `/earnings` page — sums Stripe transfers

**Mobile**
- [ ] Payment sheet via `@stripe/stripe-react-native`
- [ ] Walker onboarding via WebBrowser in-app flow

Operational details and key setup: [`payments.md`](./payments.md).

---

## M5 · Engagement — reviews + push   (P3)

Goal: owner can rate after a walk; both sides get notifications.

**Backend**
- [ ] `ReviewsModule` — `POST /bookings/:id/review`, `GET /walkers/:id/reviews`, recalc walker rating
- [ ] `NotificationsModule`
  - [ ] `POST /push/tokens` register, `DELETE /push/tokens/:expoToken` revoke
  - [ ] Expo push dispatcher (booking-status, new chat message, walk-started, walk-ended)
  - [ ] BullMQ queue on Redis for retry/backoff

**Web/Mobile**
- [ ] Review prompt on booking-completed screen (1–5 stars + comment)
- [ ] Mobile: register push token on app start; deep-link from notification taps

---

## M6 · Ship — CI, observability, AWS deploy   (P3)

Goal: green PRs, prod-ready containers, app in stores' internal tracks.

**CI** (`.github/workflows/ci.yml`)
- [ ] `pnpm typecheck`, `pnpm lint`, drizzle migrate dry-run
- [ ] Cache pnpm store + turbo

**Backend hardening**
- [ ] pino logger + OpenTelemetry SDK (traces + spans)
- [ ] Rate limiting (`@fastify/rate-limit`), helmet, CORS allowlist
- [ ] Health probes for ECS

**AWS infra (Terraform or CDK)**
- [ ] ECR + ECS Fargate task for `backend`
- [ ] RDS Postgres + RDS Proxy (when conn count rises)
- [ ] ElastiCache Redis
- [ ] CloudFront + S3 (or Amplify) for `web`
- [ ] Cognito User Pool + Hosted UI domain
- [ ] Secrets Manager for STRIPE_*, COGNITO_CLIENT_SECRET

**Mobile release**
- [ ] EAS Build profiles (development / preview / production)
- [ ] TestFlight (iOS) + Play Console internal track (Android)

---

## M7 · Pro-tool differentiation   (P2)

> Added 2026-05-09 after competitive review (Rover / Wag / Care.com). Strategy: stop being "another marketplace" and become the CRM-grade tool a working pet-services pro can run their whole business on. Each item is a sticky platform feature — increases provider retention so they don't drift off-platform after the first connection.

**Voice-to-data walk reports**
- [ ] Mobile: end-walk screen gets a "record summary" button (max 60s)
- [ ] Backend: `POST /walks/:id/report` accepts audio, queues a `walk-report` BullMQ job
- [ ] Worker: Whisper (OpenAI) → transcript → gpt-4o-mini → structured fields (mood, bowel, water, incidents, notes) with iconography
- [ ] Owner side: rendered as a card on the booking detail screen with a "play original" fallback
- [ ] Cost guardrail: ~$0.01 per report; quota check before queueing

**Off-platform clients in provider calendar**
- [ ] New table `provider_external_bookings` (no payment, no fee, provider-only visibility)
- [ ] CRUD endpoints under `/me/external-bookings`
- [ ] Calendar UI shows external blocks alongside platform bookings, with a different visual treatment
- [ ] Excluded from owner-facing availability the same way Google freebusy windows are

**Tax export**
- [ ] Backend: `GET /me/tax-report?year=YYYY` → CSV/PDF with provider's Stripe transfers, platform fees, and net earnings, grouped by month
- [ ] Frontend: Finances tab → "Download tax report" button per year
- [ ] Reuses the invoice-PDF generator already shipped in M4

**Optional intro video on profile**
- [ ] Backend: extend `service_provider_profiles` with `intro_video_url` (max 15s, MP4)
- [ ] Upload via signed S3 PUT (separate bucket prefix `provider-intros/`)
- [ ] Web/mobile: video plays in profile header; default poster is provider avatar
- [ ] Search-result cards stay photo-first — no autoplay carousel

---

## M8 · Trust & safety   (P3)

> Layered trust signals that don't require expensive insurance underwriting.

**Optional partner insurance at checkout**
- [ ] Integration with a 3rd-party pet-care insurance provider (TBD)
- [ ] Booking checkout gets a "Add insurance (+$X)" toggle
- [ ] Premium added to PaymentIntent; provider field on `bookings`
- [ ] Out of scope for v1: claims handling — partner owns it

**AI Vision Safety as soft warning**
- [ ] On photo upload (S3 trigger or BullMQ post-upload job), call Rekognition / GPT-4o vision
- [ ] Check: image contains a dog, image is outdoors, leash visible (where applicable)
- [ ] Failure → flag in admin review queue and send the owner a "we noticed something" notification, NOT a hard block on the provider
- [ ] Goal is fraud deterrence, not gatekeeping

**Safety Score (additive to star rating)**
- [ ] Compute from existing data: GPS-route deviation %, chat response p50, photo-update cadence during walk
- [ ] Display under stars on profile + provider card: "92 · safety"
- [ ] No new collection — purely a derived rollup over `gps_pings`, `messages`, walk-photo events

**Verified Check-in badge (opt-in)**
- [ ] Provider scans QR on collar OR submits a face-photo of dog before the walk starts
- [ ] If matches the pet-profile photo via Rekognition compareFaces → "Verified Check-in" badge on this walk
- [ ] Optional, never blocks the walk if it fails — just no badge

---

## M9 · Multi-provider payments   (P2)

> Added 2026-05-10. Today payment methods live only in Stripe — backend proxies `customer.list_payment_methods` on every render and we have no row of our own. Fine while Stripe is the only processor; breaks the moment we add PayPal / Payoneer / local wallets. Goal: own the `payment_methods` table, abstract the processor behind a `PaymentProvider` interface, route charges/refunds/webhooks through that interface so booking and checkout layers stay processor-agnostic.

**Schema**
- [ ] Drizzle migration: new table `payment_methods (id, user_id, processor, type, external_id, external_customer_id, brand, last4, exp_month, exp_year, email, label, is_default, status, created_at, updated_at)`
- [ ] Partial unique index: one default per user (`WHERE is_default = TRUE`)
- [ ] Partial index for active rows (`WHERE status = 'active'`)
- [ ] Generalise `payments`: rename `stripe_payment_intent_id` → `external_payment_id`, `stripe_charge_id` → `external_charge_id`, add `processor` column (backfill `'stripe'` for existing rows)

**Backend abstraction**
- [ ] `PaymentProvider` interface: `createSetupSession`, `finalizeSetup`, `charge`, `refund`, `detach`, `parseWebhook` — returns/accepts a normalised event/snapshot shape
- [ ] `PaymentProviderRegistry` — maps `processor` name → implementation
- [ ] Refactor existing Stripe code into `StripeProvider` implementing the interface (no behaviour change)
- [ ] `PaymentsService` becomes a router: looks up `payment_method.processor`, delegates to the matching provider — booking/checkout never imports Stripe directly

**Endpoints (processor-agnostic)**
- [ ] `GET /payment-methods` — reads from local table, no round-trip to Stripe
- [ ] `POST /payment-methods/setup-session` — body `{ processor }`, returns `{ clientToken, sessionId }` for the matching SDK
- [ ] `POST /payment-methods/finalize` — `{ sessionId }`, creates the local row from the snapshot the provider returned
- [ ] `DELETE /payment-methods/:id` — detaches via the right provider
- [ ] `POST /payment-methods/:id/default` — flips `is_default`, single-row guarantee enforced by partial unique index
- [ ] `PATCH /payment-methods/:id` — set `label`

**Webhooks**
- [ ] Per-provider endpoint: `POST /webhooks/stripe` (already exists), `POST /webhooks/paypal`, etc.
- [ ] Each parses raw body via its provider adapter into a `NormalizedEvent`
- [ ] Common downstream handler updates `payments` + `payment_methods` regardless of source

**Frontend**
- [ ] Card list reads from `GET /payment-methods` — UI renders Visa/MC/PayPal/Apple Pay/Google Pay icons by `(type, brand)`
- [ ] Add-method flow: pick processor → call setup-session → run matching SDK (Stripe Elements / PayPal SDK / etc.) → finalize → row appears
- [ ] Set-default and Remove are common across processors

**Second provider (parallel — only after the abstraction lands)**
- [ ] `PaypalProvider` impl + webhook adapter
- [ ] PayPal SDK on web + mobile
- [ ] No changes to booking/checkout layers — that's the test

**What we deliberately don't mirror**
- Full transaction history per processor — lives in their dashboard
- Card PAN / CVV — never (PCI scope minimal)
- Anything beyond the display snapshot needed to render the row

---

## M10 · User profile expansion   (P3)

> Added 2026-05-10. Today the `users` row carries a single `home_address` string and not much else. The booking flow, provider profile, and several future surfaces all need richer profile state. Goal: address book, account status, birth date, and a clean split of display preferences off the main `users` row.

**Address book**
- [ ] New table `user_addresses (id, user_id, label, line1, line2, city, region, postal_code, country, lat, lng, unit, gate_notes, is_default, created_at, updated_at)`
- [ ] Partial unique index: `WHERE is_default = TRUE` per `user_id` (one default at a time)
- [ ] Migration: backfill — for each user with a non-empty `home_address`, create one `user_addresses` row labelled "Home" with `is_default = TRUE`
- [ ] Drop / deprecate `users.home_address` after backfill
- [ ] Endpoints: `GET /me/addresses`, `POST /me/addresses`, `PATCH /me/addresses/:id`, `DELETE /me/addresses/:id`, `POST /me/addresses/:id/default`
- [ ] Booking flow Step 3 (Location → Pet's home) reads the address book instead of the single profile field; "Add new" saves back to the book
- [ ] Profile → Personal tab gets an Addresses section (list with default badge, add/edit/delete)
- [ ] Custom-address one-off in booking gets a "Save to my addresses" checkbox

**Account status**
- [ ] Add `users.status` enum: `active | pending_verification | suspended | banned | deleted`
- [ ] Default `'active'`, indexed for moderation queries
- [ ] Auth guard rejects non-`active` users (login flow surfaces a friendly state-specific message)
- [ ] No admin UI in this milestone — flips happen via DB / future moderation tool

**Birth date**
- [ ] Add `users.birth_date` (nullable date)
- [ ] Surfaced on Profile → Personal tab as an optional field
- [ ] Used for age-gating providers in regulated categories (vet, fitness) when M2/onboarding gets there
- [ ] Never shown publicly

**Preferences split**
- [ ] New table `user_preferences (user_id PK, language, currency, units, notif_email, notif_push, notif_sms, updated_at)`
- [ ] Migration: move `preferred_currency`, language hint, units off `users` into the new table; backfill defaults
- [ ] Endpoints: `GET /me/preferences`, `PATCH /me/preferences`
- [ ] UserMenu display preferences continue to work end-to-end against the new endpoints

**Provider rating denorm**
- [ ] Add `users.rating` (numeric, nullable) — denormalised average from `reviews`
- [ ] Trigger or background recompute on review insert/update
- [ ] Provider listing card and search results read this column instead of computing AVG(reviews) per request

**Out of scope here**
- Wallet balance / internal credits — Stripe Connect handles money, no internal ledger
- Profile feed / posts — not in product scope
- Saved payment methods — that's M9

---

## M11 · UX resilience — empty / error / loading / offline   (P2)

> Added 2026-05-10. **Web-only milestone.** Per the web-first strategy (M12 covers native rebuild), this milestone hardens the Next.js client and the backend it talks to. Native mobile UX work is deferred to M12 — the existing Expo app keeps running but does not get new resilience features here.
>
> Backend has a global `HttpExceptionFilter` with a normalised `ApiError` shape. Web has reusable `Skeleton` and `ErrorState` and uses them on most query-driven pages — but no Next.js `error.tsx` / `loading.tsx` / `not-found.tsx`, no offline detection, no shared `EmptyState`, and inline ad-hoc empties scattered across pages. Goal: the patterns described in `prompt_design.txt` (Empty States / Error States / Loading & Skeletons / Common Patterns sections) actually exist in code in the web client. Responsive layout means a mobile browser opening the same Next.js app gets the full experience until M12 lands.

**Backend hardening**
- [ ] Stable `ErrorCode` enum in `@petwalker/shared` (e.g. `VALIDATION_ERROR`, `PROVIDER_NOT_ONBOARDED`, `PAYMENT_DECLINED`, `BOOKING_CONFLICT`, `RATE_LIMITED`, `SESSION_EXPIRED`); all thrown HttpExceptions reference one
- [ ] Request-ID middleware (header `x-request-id`, propagated into logs and error response body) so client logs can be matched to server logs
- [ ] `@fastify/rate-limit` per-route on auth + booking + payment endpoints; map breaches to `RATE_LIMITED` with `retryAfter` seconds
- [ ] Persist webhook idempotency in Redis (replace in-memory `Set` in `payments.service.ts`) — survives restarts and clusters
- [ ] Friendly mapping of common DB errors (unique-violation, FK-violation) to typed `ApiError` codes instead of bare 500s

**Web — Next.js boundaries**
- [ ] Root `app/error.tsx` with the friendly "Something went wrong" page from the prompt + Retry button (resets the boundary)
- [ ] Root `app/not-found.tsx` with the 404 illustration + Home / Search buttons
- [ ] Root `app/loading.tsx` with a route-level skeleton matching the shell
- [ ] Per-section `error.tsx` for routes that own complex sub-trees (`/providers`, `/bookings`, `/profile`)
- [ ] Per-section `loading.tsx` matching the eventual layout (skeleton rows, not spinner)
- [ ] Global `ErrorBoundary` wrapper for client components that throw outside the App Router boundary

**Web — shared components**
- [ ] `<EmptyState>` component (illustration prop, headline, subcopy, primary action, optional secondary link) — replaces every inline empty markup
- [ ] Empty illustrations set (search-no-results, pets, bookings, favorites, messages, notifications, addresses, payment methods, schedule, earnings, reviews) — single SVG sprite or per-state file, reusable
- [ ] `<HeavyList>` wrapper around list queries: 6–10 skeleton rows on first load, 60 % opacity + top progress bar on refilter/refetch, 3-row skeleton on pagination append, "Couldn't load more — Retry" inline row on mid-page failure
- [ ] `<TopProgressBar>` (NProgress-style) auto-driven by in-flight TanStack Query mutations + heavy fetches
- [ ] `<OfflineBanner>` reading `navigator.onLine` + `online`/`offline` events; persistent at top while offline
- [ ] Toast system (sonner / radix-toast): bottom-right desktop, bottom-center mobile; max 1 visible; success auto-dismiss 5 s, errors sticky with Close
- [ ] `<DestructiveConfirm>` dialog component used everywhere for cancel-booking / remove-card / delete-pet, etc. — exact-consequence copy + red primary + default-focused secondary
- [ ] Image placeholder (blurhash or solid-tone) on heavy photo lists; crossfade on load

**Web — wire it up**
- [ ] Replace inline empty UI on every page with `<EmptyState>` (audit: bookings tabs, favorites, pets, addresses, payment methods, messages, notifications, schedule, earnings, reviews)
- [ ] Wrap every paginated list with `<HeavyList>` (providers search, billing history, earnings, messages)
- [ ] Wire `<TopProgressBar>` into `_app` layout
- [ ] Wire `<OfflineBanner>` globally
- [ ] Replace `confirm()` and ad-hoc dialogs with `<DestructiveConfirm>`

**Mobile-browser parity (still web — running Next.js in a phone browser)**
- [ ] Audit every page on a 375 px viewport: filters, forms, modals, sticky footers, virtual keyboard behaviour
- [ ] Sticky bottom action bars (booking flow, provider onboarding) sit above the iOS Safari URL bar
- [ ] Pull-to-refresh enabled where it adds value (list pages); not on detail pages
- [ ] Touch targets verified ≥ 44 px throughout
- [ ] Maps and live-tracking work in mobile browser (geolocation API + map provider on touch)

**Shared error normalisation (shared package)**
- [ ] `normalizeApiError(error): { code, message, retryable }` in `@petwalker/shared` — single source of truth for which errors are retryable, which trigger sign-out, which require a dialog (web consumes it now; M12 mobile will reuse the same helper)
- [ ] i18n keys for every standard `ErrorCode` (en first per repo rule; ru/es/zh/he batched later)

**Acceptance**
- [ ] No web screen — desktop or mobile browser — shows a blank state, raw stack trace, or `[object Object]` for any common failure mode (network down, 500, 404, 403, payment declined, validation)
- [ ] Every list has a defined empty state, loading skeleton, and error state
- [ ] Offline mode shows a banner everywhere and degrades gracefully (cached reads, queued writes)
- [ ] A mobile-browser walkthrough of the booking flow + active-walk view + provider pipeline is fully usable end-to-end

---

## M12 · Native mobile rebuild   (P3)

> Added 2026-05-10. **Strategic decision: web-first, native-later.** The Next.js client is responsive and works end-to-end in a mobile browser, so we don't need a parallel native app to ship. Once the web product is stable and we know exactly which surfaces benefit from native (background GPS, push, biometrics, deep platform integration), we rebuild the mobile app from scratch instead of patching the current Expo scaffold.
>
> The current `apps/mobile` Expo app stays alive but no new feature work lands there until this milestone — bug fixes only. Anything mobile-shaped in the prompt or the roadmap is delivered via responsive web until then.

**Decision triggers (start M12 when ALL of these are true)**
- [ ] Web booking flow stable for ≥ 30 consecutive days (no high-severity bugs)
- [ ] >100 weekly active users on web (real signal, not vanity)
- [ ] Concrete user request count for native features (push reminders, background GPS during walk, offline mode) high enough to justify the platform spend

**Pre-rebuild work**
- [ ] Delete or archive `apps/mobile` — start clean, no carry-over
- [ ] Pick the stack on the basis of the team in 2026, not the team in 2025: Expo SDK at the time, RN architecture (Fabric / new arch), state lib, etc. — re-evaluate, don't auto-pick what `apps/mobile` had
- [ ] Reuse `@petwalker/shared` types + DTO + API client wholesale — that's the whole reason it exists
- [ ] Reuse the `normalizeApiError` helper from M11
- [ ] Lift the empty/error/loading visual language from web; native components match the web naming so any future designer keeps a single mental model

**Native-only surfaces (the reason we're doing this at all)**
- [ ] Background GPS during active walk (`expo-location` background task) — the headline feature web cannot match
- [ ] Push notifications via Expo push (booking-status, new chat, walk-started, walk-ended)
- [ ] Native pay sheet (Stripe Apple/Google Pay through `@stripe/stripe-react-native`)
- [ ] Camera capture for in-walk photos (faster than browser file picker)
- [ ] Biometric unlock for the app (FaceID / fingerprint) — optional
- [ ] Deep links from push notifications (open the right booking detail)

**Parity surfaces (reach feature parity with web)**
- [ ] Auth, search, discovery, provider profile, booking flow, live tracking, post-service, profile, addresses, payment methods, billing history
- [ ] Provider: onboarding wizard, schedule builder, booking pipeline, earnings, payouts
- [ ] Empty / error / loading / offline patterns ported from web `<EmptyState>`, `<HeavyList>`, etc.
- [ ] OfflineBanner via NetInfo, mutation queue for writes attempted offline (cancel booking, send message)
- [ ] Pull-to-refresh on every list

**Release**
- [ ] EAS Build profiles (development / preview / production)
- [ ] TestFlight + Play Console internal track first
- [ ] App Store + Play Store store listings (icons, screenshots, descriptions in en/ru/es/zh/he)

**Out of scope here**
- Rewriting backend — no changes required, mobile consumes the same `@petwalker/shared` API client
- Changing web — by the time M12 starts, web is the source of truth and stays that way

---

## M13 · Search & discovery polish   (P2)

> Added 2026-05-10. Aligns search/discovery with `prompt_design.txt`. Today: filters work, sort is implicit, no map view, no saved searches, no language filter, single-pet booking only.

**Sort & filter**
- [ ] Sort dropdown: Recommended (default — relevance × proximity × rating composite), Distance, Price (low → high / high → low), Rating, Most experienced, Newest
- [ ] Filter: Languages spoken (multi-select) — adds `users.languages` array column + Drizzle migration
- [ ] Filter: Accommodation supported toggle (boolean read off provider's offerings)
- [ ] "Available now" filter chip that hides providers currently in time-off

**Map view**
- [ ] List ↔ Map toggle in the search results header
- [ ] Map with provider pins clustered at low zoom levels
- [ ] Tapping a pin highlights the matching card in a horizontal carousel at the bottom (mobile) / a sidebar list (desktop)
- [ ] Hovering a card on desktop highlights the pin
- [ ] On-time-off providers show a muted pin and "Back on Mar 12" badge

**Saved searches**
- [ ] New table `saved_searches (id, user_id, label, query_json, created_at)`
- [ ] Endpoints: list / create / delete / re-run
- [ ] Account → Saved searches list
- [ ] "Save this search" CTA above results when filters are non-default

**Multi-pet booking**
- [ ] Junction table `booking_pets (booking_id, pet_id)` + Drizzle migration; back-fill existing single-pet bookings
- [ ] Per-pet surcharge field on provider's service catalog (optional)
- [ ] Booking flow Step 2 becomes multi-select; total price recalculates as pets are added/removed
- [ ] Owner profile pet card shows the count when multi-pet
- [ ] Provider booking detail screen lists all pets in the booking

---

## M14 · Trust, safety & moderation   (P1)

> Added 2026-05-10. Today: cancellation policy in `cancellation-policy.ts` exists but no user-facing report/block flows, no auto-pause logic, no credential verification UI even though regulated categories (vet) need it before launch. **Why P1:** the marketplace cannot launch publicly without these.

**Report & block**
- [ ] New table `user_reports (id, reporter_user_id, reported_user_id, booking_id?, reason_code, free_text, screenshots[], status, created_at)`
- [ ] New table `user_blocks (blocker_user_id, blocked_user_id, created_at)` — both directions enforced (block hides listings + prevents new bookings + hides chat)
- [ ] Report flow available from provider profile, owner profile (with shared booking), and any chat thread
- [ ] Block toggle from chat overflow + profile overflow
- [ ] Account & Security → Blocked users list with Unblock action
- [ ] Reports route into a moderation queue (admin tooling out of scope here — initial reads via DB)

**Auto-pause & escalation**
- [ ] Counter on `users` (provider): cancellations_30d, substantiated_reports_30d
- [ ] Job that recomputes daily and flips `users.status = 'suspended'` per the rules in the prompt (3 cancellations OR 1 substantiated report in 30 d)
- [ ] Suspended providers hidden from search; existing bookings are emailed and allowed to continue or refund

**In-progress safety thread**
- [ ] "Something's wrong" button on Live Tracking opens a support thread pre-populated with booking + GPS context
- [ ] Support gets a real-time alert (Slack webhook to start; ticketing later)

**Credential verification (regulated categories)**
- [ ] New table `provider_credentials (id, user_id, kind, license_number, jurisdiction, document_s3_key, status, reviewer_note, reviewed_at, created_at)`
- [ ] Onboarding wizard Step 4 surfaces credential upload for regulated categories
- [ ] Veterinary: service hidden from owner search until at least one credential per offered service is `Verified`
- [ ] Other categories (training, grooming, fitness, senior care): credential upload optional; approval awards a "Verified" badge on listing cards
- [ ] Status states: Not Submitted / Pending Review / Verified / Rejected (with reason); resubmission flow

**Owner verification (planned)**
- [ ] Optional ID check via 3rd-party (TBD); awards "Verified owner" badge on owner reviews

---

## M15 · Compliance — privacy, legal, deletion   (P1)

> Added 2026-05-10. Required for EU launch and App Store / Play Store policies. Today: nothing.

- [ ] Cookie banner with Accept / Reject / Customize (categories: Necessary, Analytics, Marketing); choice persisted; "Manage cookies" link in footer re-opens
- [ ] Footer links: Terms, Privacy, Cookie policy, About (placeholder pages OK at launch)
- [ ] GDPR data export: `GET /me/export` produces a zip (profile, bookings, messages, reviews, audit log); rate-limited 1 / 24 h
- [ ] Account deletion: two-step confirmation, soft-delete with anonymisation (`Deleted user` for review authorship); booking + payment records retained for legal periods
- [ ] Age requirement at signup: 18+ checkbox + DOB field (uses `users.birth_date` from M10); blocks signup if under
- [ ] Audit log: `audit_log (user_id, event_type, payload, created_at)` capturing logins, profile edits, address changes, payment-method changes, deletion request, data export request

---

## M16 · Help & support   (P2)

> Added 2026-05-10. Today: nothing — broken flows surface as raw errors with no user route forward.

- [ ] Help Center static content (markdown / MDX): Booking, Payments, Cancellations, Becoming a provider, Safety. Searchable.
- [ ] In-app support chat: dedicated thread between user and the support team, surfaced from the avatar menu, footer, every error state, and contextual "Get help" links inside booking / payment / report flows
- [ ] Pre-fill the support thread with current screen + booking context when opened from a contextual link
- [ ] Status indicator at the top of Help Center: green / partial / degraded — driven by a small JSON file the team flips during incidents
- [ ] Inline FAQ snippets at high-question moments (booking confirm "Why am I being charged now?", Cancel dialog "What's the refund policy?")
- [ ] Search-no-results, payment-declined, and 5xx error states get "Contact support" CTAs that pre-fill the thread

---

## M17 · Promotions — promo codes, referrals, tipping   (P3)

> Added 2026-05-10. Tipping is referenced in the post-service flow; promo codes appear in checkout; referral programs are common for marketplaces. Bundled because they share the codes / credits / payout infrastructure.

**Promo codes**
- [ ] New table `promo_codes (code PK, kind, discount_pct, discount_cents, max_uses, max_uses_per_user, expires_at, created_at)` + `promo_redemptions (code, user_id, booking_id, redeemed_at)`
- [ ] Booking checkout: "Have a code?" expandable row applies code at intent creation
- [ ] Backend validates and applies discount before computing platform fee
- [ ] Account → Promo codes list (active / expired)

**Referral**
- [ ] Each user gets a referral code; sharing produces a deep link
- [ ] First completed booking by referee credits both sides (TBD — fixed amount or % off)
- [ ] Account → Refer a friend with share buttons

**Tipping (UX rollout)**
- [ ] Post-service Step 5 (already in the prompt): preset 10 / 15 / 20 % or custom
- [ ] Tip charged separately as a no-fee payment direct to the provider's connected account
- [ ] Tip reflected on the invoice + earnings dashboard

---

## M18 · Provider onboarding wizard   (P2)

> Added 2026-05-10. Profile setup currently exists as a flat `/profile/provider` form. The prompt describes a 6-step resumable wizard with progress bar — better activation funnel for new providers.

- [ ] New route `/onboarding/provider` with stepper (Basic info / Video resume / Service catalog / Credentials / Availability / Payouts)
- [ ] Persistence: each step saves to the existing user/provider/credential tables; entering the route auto-resumes from the first incomplete step
- [ ] Progress bar + skip-for-now on optional steps
- [ ] Video resume upload: 15–60 s, MP4, signed S3 PUT into `provider-intros/` prefix; preview before save
- [ ] Service catalog step uses the existing offerings UI but presented as a wizard card
- [ ] Credentials step: surfaces only when the picked categories are regulated/certifiable (M14 ships the data layer)
- [ ] Availability step: pre-fills with a sensible default (Mon–Fri 9–17), provider tweaks
- [ ] Payouts step: kicks off the existing Stripe Connect onboarding link
- [ ] Completion screen: "You're live — first listing visible to owners now"

---

## Coverage gap — prompt features without dedicated milestones

For the few prompt items that are too small to deserve a milestone of their own, fold them into the next PR that touches the relevant area:

- **Provider reply to reviews** — extends M5; one column on `reviews` (`provider_reply_text`, `provider_reply_at`) + UI
- **Notification categorisation + per-category mute** — extends M5/web-notifications; one column on `web_notifications.category` already implicit, add filter tabs + a `notification_mutes` table
- **In-walk photo stream** — extends M3; reuse S3 photo upload, broadcast on the tracking gateway
- **Marketing landing pages (signed-out)** — separate marketing surface; not in this app design system, but the "Sign up to book" handoff is

---

## Out of scope (rejected with reason)

- **Direct contact unlock after first booking** — kills the marketplace flywheel. Once parties have phones they can transact off-platform on every subsequent booking. We instead make the platform stickier through M7's pro tools.
- **Importing reviews from Rover / Wag / Care.com via scraping** — ToS violation + copyright + PII risk. Replaced with self-attested "X yrs experience on other platforms" field.
- **Mandatory AI dog-face check-in** — friction-heavy, dog re-ID accuracy ~70%, false negatives block real walks. Kept as opt-in "Verified Check-in" instead.
- **AI-driven Smart Availability** ("open a slot, demand is high right now") — needs real demand data first. Revisit when there's >1000 bookings/week.
- **PostGIS migration for provider search** — current bbox + Haversine-in-TS scales fine. Revisit when search latency exceeds budget.
