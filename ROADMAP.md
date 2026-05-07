# petwalker — implementation roadmap

Ordered by dependency + priority. Each milestone unblocks the next.
Foundation phases (P0 monorepo/infra/shared/db) are done; status as of 2026-05-06.

Legend: P0 blocker · P1 must · P2 should · P3 later

---

## ✅ Foundation (done)

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

## What I work on right now

**Next:** M1 — start with `backend/src/main.ts` Nest+Fastify bootstrap and `AuthModule`, then web Cognito flow, then mobile.

Within M1, the dependency order is:
`backend bootstrap → backend Cognito guard → /auth/me → web Cognito → mobile Cognito`.
