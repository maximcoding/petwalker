# Architecture

> What the system is, how it's wired, and what each piece is responsible for.
> For setup steps and keys see [`setup.md`](./setup.md). For what's coming next see [`roadmap.md`](./roadmap.md).

A two-sided pet services marketplace connecting pet owners with professional care providers. Owners browse, book, and pay for services; providers manage their schedule, availability, and earnings — all in one platform.

---

## What it does

Owners register their pets and search for nearby providers across 11 service categories: dog walking, grooming, sitting, boarding, training, daycare, pet photography, massage & wellness, senior pet care, veterinary visits, and fitness. They pick a time slot or date range, pay through the app, and track the session live on a map. Providers set their availability, publish time slots, receive bookings, and get paid via Stripe Connect.

Core user flows:

- **Owner:** register → add pets → find a provider → book a time → pay → track in real time → review
- **Provider:** register → set service offerings + hourly rates → configure weekly availability → publish slots → confirm bookings → start/end walk → receive payout

---

## Monorepo structure

```
dogwalk/
├── shared/     # @petwalker/shared — DTOs, enums, types, API client (consumed by all three apps)
├── backend/    # @petwalker/backend — NestJS REST + WebSocket API
├── web/        # @petwalker/web — Next.js 14 owner/provider web app
├── mobile/     # @petwalker/mobile — Expo (React Native) mobile app
├── infra/      # Docker Compose for local dev (Postgres, Redis, MinIO, Cognito local)
└── docs/       # this folder
```

Managed with **pnpm workspaces** and **Turborepo**. Node ≥ 20.11, pnpm 9.12.

---

## Tech stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 14 (App Router), TanStack Query 5, Tailwind CSS 3, i18next |
| Mobile | Expo ~51 / expo-router 3, Zustand, React Query, Stripe React Native |
| Backend | NestJS 10 on Fastify, Zod validation, BullMQ job queues |
| Database | PostgreSQL 16 with Drizzle ORM, UUID PKs, pgcrypto, citext |
| Cache / Queue | Redis 7 via BullMQ |
| Auth | AWS Cognito (prod) · cognito-local (dev) |
| Payments | Stripe Connect — payment intents, webhooks, refunds, Apple/Google Pay |
| Storage | AWS S3 (prod) · MinIO (dev) — pre-signed PUT URLs for direct upload |
| Real-time | Fastify WebSocket gateways — chat, live GPS tracking, web notifications |
| Push notifications | Expo Server SDK → iOS, Android, Web |
| Shared contracts | Zod DTOs in `@petwalker/shared` consumed by both backend and clients |

---

## Source of truth

- **App contracts** (enums, interfaces, DTOs) — `@petwalker/shared` only.
- **Database schema** — Drizzle, in `backend/src/db/schema/`. Migrations in `backend/drizzle/migrations/` are authoritative. `infra/postgres/init/` only seeds the `pgcrypto` + `citext` extensions.
- **Dev seeds** — `backend/src/db/seed.ts` (small fixtures) and `backend/src/db/bulk-seed.ts` (10K providers, 50K pets, 50K bookings).
- **External services** — every key, env var and how-to-set-it-up: [`setup.md`](./setup.md). Single source of truth.

Drizzle `pgEnum` definitions import value lists from `@petwalker/shared/enums`, so adding an enum value is a one-line change there. Drizzle inferred row types are suffixed `Row` (e.g. `UserRow`) so they don't shadow the shared `User` interface.

---

## Features

### Bookings

- Two booking modes: **time slots** (choose a pre-published discrete slot) and **date range** (multi-day or overnight, e.g. boarding)
- Lifecycle: `pending → confirmed → in_progress → completed / cancelled`
- Cancellation with automatic refund calculation and Stripe refund issuance
- Address source tracking — service location resolved at booking time from one of: pet address, owner address, provider address, offering address, or a custom address entered at booking
- **Recurring series** — book the same slot weekly or on specific days for a period
- Accommodation flag for overnight stays at the owner's property

### Providers

- Per-service offerings with hourly rate and booking mode
- Weekly availability template (recurring time windows per day)
- Blackout blocks (time-off windows). External busy times pulled from the provider's connected Google Calendar via OAuth + freebusy.query
- Slot auto-generation from availability template
- Per-offering service address and supported location sources

### Payments

- Stripe Connect Express for provider onboarding and payouts
- 15% platform application fee
- Dev mode requires zero Stripe credentials (in-process mock)
- Stripe webhook reconciliation — booking confirmed automatically on `payment_intent.succeeded`
- Earnings dashboard for providers
- See [`payments.md`](./payments.md) for the full operational runbook.

### Real-time

- WebSocket chat between owner and provider per booking
- Live GPS polyline tracking during active walks (lat/lng/timestamp samples stored as JSONB)
- Web push notifications via WebSocket; mobile push via Expo

### Other

- Photo uploads for users and pets (pre-signed S3 PUT, client uploads directly)
- Favorites — owners bookmark providers
- Reviews — one star rating + text review per completed booking
- i18n — i18next on both web and mobile

---

## Backend modules

| Module | Responsibility |
|---|---|
| `auth` | Cognito JWT verification, user upsert |
| `users` | Profile, service profile, availability, offerings, blackouts |
| `pets` | Pet CRUD, photo upload URLs |
| `bookings` | Create, confirm, start, end, cancel; recurring series |
| `providers` | Search (location + service type), detail, free slots |
| `messages` | Booking chat — list + REST fallback send |
| `walks` | GPS tracking data retrieval |
| `payments` | Stripe Connect onboarding, payment intents, earnings, webhooks |
| `reviews` | Create and list reviews |
| `favorites` | Toggle and list favorited providers |
| `calendar` | Google Calendar OAuth (freebusy.query) — replaces v1 iCal feeds. See [`google-calendar-setup.md`](./google-calendar-setup.md). |
| `notifications` | Push token registration, Expo push dispatch via BullMQ |
| `storage` | S3/MinIO pre-signed URL generation |
| `ws` | WebSocket gateways: chat, GPS tracking, web notifications |

---

## Database tables

`users` · `pets` · `bookings` · `walks` · `gps_pings`
`service_provider_profiles` · `provider_availability` · `provider_blackouts` · `provider_slots` · `provider_service_offerings`
`messages` · `user_favorites` · `reviews`
`stripe_accounts` · `payments`
`recurring_series`
`push_tokens` · `web_notifications` · `google_oauth_tokens` · `external_busy_blocks`

PostgreSQL enums: `user_role`, `booking_status`, `payment_status`, `push_platform`, `service_type`

Migrations are managed with Drizzle Kit (`drizzle/migrations/`). Schema changes always go through a migration file — never direct DDL.

---

## Real-time architecture

- **GPS tracking** — Expo client emits position over WebSocket (`/ws/tracking`), API gateway publishes to Redis channel `walk:{id}`, owner client subscribes via WS to same channel. Pings batch-write to `gps_pings` every N seconds.
- **Chat** — same pattern, room key `booking:{id}:chat`. Messages persisted on send, dropped to subscribers via Redis fanout. Unread counters in Redis hash.

---

## Auth strategy

**Backend does NOT implement authentication. Backend only accepts authorized calls.**

- **Cognito does everything auth-related.** Sign-up, confirm, sign-in, refresh, sign-out, MFA, password reset, email verification — all happen client-side against Cognito's own API (`@aws-amplify/auth` on web; `@aws-amplify/auth` or `amazon-cognito-identity-js` on mobile). We never proxy any of these through our backend.
- Once the client has a valid Cognito ID token, it sends it to the API as `Authorization: Bearer <id_token>`.
- Backend `CognitoGuard` verifies the JWT via `aws-jwt-verify` (JWKS auto-cached) and rejects with 401 otherwise. On the first authenticated request, `AuthService.upsertUser()` creates a row in `users` keyed by `cognito_sub` — that's the only mutation in the auth path. After that, `cognito_sub` is the join key everywhere.
- The backend has exactly **one** auth-related endpoint: `GET /auth/me`. There is no `/auth/sign-up`, `/auth/sign-in`, `/auth/refresh`, `/auth/confirm` — and there never will be.
- We never see passwords. Cognito owns the credential lifecycle.

---

## What's done, what's next

Milestone status and dependency-ordered task breakdowns are in [`roadmap.md`](./roadmap.md) — single source of truth for "what shipped" and "what's coming".
