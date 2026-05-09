# Roadmap

> Dependency-ordered implementation roadmap. Each milestone unblocks the next.
> See [`architecture.md`](./architecture.md) for the system as it stands today.

Legend: **P0** blocker · **P1** must · **P2** should · **P3** later

---

## Status snapshot

| Milestone | Status |
|---|---|
| Foundation (monorepo, infra, shared, db) | Shipped |
| M1 · Auth + skeletons | Shipped |
| M2 · Core marketplace (profiles, pets, providers, bookings) | Shipped |
| M3 · Active walk — tracking + chat | Shipped |
| M4 · Stripe payments | Shipped |
| M5 · Reviews + push | Shipped |
| M6 · CI / observability / AWS deploy | Planned |
| M7 · Pro-tool differentiation (voice reports, off-platform calendar, tax export, intro video) | Planned |
| M8 · Trust & safety (optional insurance, AI vision soft-warn, safety score, verified check-in) | Planned |

The per-milestone task lists below are kept verbatim as the original planning artifacts. Sub-items aren't actively re-checked when work ships — treat them as "what we set out to build" snapshots rather than a live tracker. For day-to-day task tracking, see the `TASKS.md` work file (if used) or your project tracker of choice.

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

## Out of scope (rejected with reason)

- **Direct contact unlock after first booking** — kills the marketplace flywheel. Once parties have phones they can transact off-platform on every subsequent booking. We instead make the platform stickier through M7's pro tools.
- **Importing reviews from Rover / Wag / Care.com via scraping** — ToS violation + copyright + PII risk. Replaced with self-attested "X yrs experience on other platforms" field.
- **Mandatory AI dog-face check-in** — friction-heavy, dog re-ID accuracy ~70%, false negatives block real walks. Kept as opt-in "Verified Check-in" instead.
- **AI-driven Smart Availability** ("open a slot, demand is high right now") — needs real demand data first. Revisit when there's >1000 bookings/week.
- **PostGIS migration for provider search** — current bbox + Haversine-in-TS scales fine. Revisit when search latency exceeds budget.
