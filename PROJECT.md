# PetWalker

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
└── infra/      # Docker Compose for local dev (Postgres, Redis, MinIO, Cognito local)
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
- Blackout blocks (time-off, imported from external calendars via iCal)
- Slot auto-generation from availability template
- Per-offering service address and supported location sources

### Payments
- Stripe Connect Express for provider onboarding and payouts
- 15% platform application fee
- Dev mode requires zero Stripe credentials (in-process mock)
- Stripe webhook reconciliation — booking confirmed automatically on `payment_intent.succeeded`
- Earnings dashboard for providers

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
| `calendar` | iCal feed import and blackout sync |
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
`push_tokens` · `web_notifications` · `calendar_feeds`

PostgreSQL enums: `user_role`, `booking_status`, `payment_status`, `push_platform`, `service_type`

Migrations are managed with Drizzle Kit (`drizzle/migrations/`). Schema changes always go through a migration file — never direct DDL.

---

## Local development

**Prerequisites:** Docker, Node ≥ 20.11, pnpm 9.12

```bash
# Start infrastructure (Postgres, Redis, MinIO, cognito-local, pgAdmin)
cd infra && docker compose up -d

# Install dependencies
pnpm install

# Apply migrations and seed
pnpm --filter @petwalker/backend db:migrate
pnpm --filter @petwalker/backend db:seed

# Build shared package (required before running web or mobile)
pnpm --filter @petwalker/shared build

# Run all apps
pnpm dev
```

Default ports: API `3001` · Web `3030` · pgAdmin `5050` · MinIO console `9001`

---

## Environment variables

Copy `backend/.env.example` → `backend/.env` and `web/.env.example` → `web/.env.local`. The defaults work with the Docker Compose setup out of the box.

Key variables:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `APP_ENV` | `dev` (mock Stripe, local Cognito) or `prod` |
| `COGNITO_USER_POOL_ID` | `local_petwalker` in dev |
| `STRIPE_SECRET_KEY` | Leave empty in dev to use the in-process mock |
| `AWS_S3_ENDPOINT` | Set to MinIO URL in dev |
| `EXPO_ACCESS_TOKEN` | Required in prod for push notification delivery |

---

## Project status

| Milestone | Status |
|---|---|
| M0 — Core auth, users, pets | ✅ Done |
| M1 — Provider profiles, availability, offerings | ✅ Done |
| M2 — Booking creation and lifecycle | ✅ Done |
| M3 — Live GPS tracking, messaging | ✅ Done |
| M4 — Stripe payments | ✅ Done |
| M5 — Push notifications, reviews, favorites | ✅ Done |
| M6 — CI/CD, production deploy | 🔜 Planned |
