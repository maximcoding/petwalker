# petwalker — scaffold plan

## Stack

| Layer    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Web      | Next.js 14 (App Router) + TypeScript                    |
| Mobile   | Expo SDK 50+ (React Native) + TypeScript                |
| API      | NestJS 10 on Fastify adapter                            |
| DB       | Postgres 16 + Drizzle ORM                               |
| Cache/RT | Redis 7 (queues, pub/sub for chat & GPS sockets)        |
| Auth     | AWS Cognito (User Pool) — from day 1; JWT verified via aws-jwt-verify |
| Payments | Stripe Connect (two-sided marketplace)                  |
| Push     | Expo Push API (+ optional email via SES)                |
| Infra    | Docker Compose: postgres, redis, pgadmin                |
| Build    | pnpm workspaces + Turborepo                             |

## Repo layout

```
petwalker/
├── backend/                # NestJS + Fastify; Drizzle DB lives at backend/src/db
├── web/                    # Next.js 14 — full owner/walker portal + landing
├── mobile/                 # Expo (React Native) — primary client (owner & walker)
├── shared/                 # @petwalker/shared — TS interfaces, enums, classes,
│                           #   zod schemas, API client. Imported by web, mobile, backend.
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/
│   │   ├── postgresql.conf
│   │   ├── pg_hba.conf
│   │   └── init/
│   │       ├── 01-schema.sql
│   │       └── 02-seed.sql
│   └── pgadmin/
│       └── servers.json
├── .env.example
├── .env                    # gitignored
├── Makefile                # docker shortcuts
├── package.json            # workspaces root
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## API modules (NestJS)

```
backend/src/
├── modules/
│   ├── auth/               # JWT + Cognito strategy (env-toggle)
│   ├── users/              # owners + walkers (role discriminator)
│   ├── pets/
│   ├── bookings/           # core marketplace flow
│   ├── tracking/           # WS gateway, Redis pub/sub, polyline persist
│   ├── chat/               # WS gateway per booking room
│   ├── reviews/
│   ├── payments/           # Stripe Connect, webhooks, payouts
│   └── notifications/      # Expo push tokens + dispatch
├── common/                 # filters, interceptors, decorators, pipes
├── config/                 # env validation (zod), config namespaces
└── main.ts                 # Fastify bootstrap
```

## Database (Drizzle schemas)

Initial entities — `backend/src/db/schema/`:

- `users` — id, role enum (`owner` | `walker` | `both`), email, cognito_sub (nullable), name, phone, avatar_url, created_at
- `walker_profiles` — user_id (FK), bio, hourly_rate, service_radius_km, verified_at
- `availability` — walker_id, day_of_week, start_time, end_time
- `pets` — id, owner_id, name, species, breed, weight_kg, age_years, notes, photo_url
- `bookings` — id, owner_id, walker_id, pet_id, scheduled_at, duration_min, status (`pending`|`confirmed`|`in_progress`|`completed`|`cancelled`), price_cents
- `walks` — booking_id, started_at, ended_at, polyline (jsonb — array of {lat, lng, t})
- `gps_pings` — walk_id, lat, lng, accuracy, captured_at (partitioned by month). Nearby-walker queries done in app code via bounding-box filter on `walker_profiles` (lat, lng) + Haversine in TS.
- `messages` — id, booking_id, sender_id, body, sent_at
- `reviews` — booking_id, rating (1–5), comment, created_at
- `stripe_accounts` — user_id, stripe_account_id, charges_enabled, payouts_enabled
- `payments` — booking_id, stripe_payment_intent_id, amount_cents, status
- `push_tokens` — user_id, expo_token, platform (`ios`|`android`), revoked_at

Drizzle generates migrations into `packages/db/migrations/`. The hand-written `infra/postgres/init/01-schema.sql` is just for fresh-volume Docker bootstrap; CI/prod uses Drizzle migrations as source of truth.

## Infra — docker-compose

Services:

- **postgres** — image `postgres:16-alpine`, custom `postgresql.conf` + `pg_hba.conf` mounted, init scripts auto-run on first volume create, healthcheck via `pg_isready`.
- **redis** — `redis:7-alpine`, AOF on, `--requirepass` from env.
- **pgadmin** — `dpage/pgadmin4`, `servers.json` pre-loads the petwalker connection.

Volumes: `postgres_data`, `redis_data`, `pgadmin_data` — named, in `.gitignore`.

Network: single bridge network `petwalker`.

## Makefile targets

```
make up            # docker compose up -d
make down          # stop + remove
make restart       # down && up
make logs s=api    # follow logs (s = service)
make ps
make db-shell      # psql into postgres
make db-reset      # drop & recreate DB, re-run migrations + seed
make db-migrate    # drizzle migrate
make db-seed       # run packages/db/seed.ts
make pgadmin       # open http://localhost:5050
make redis-cli
make clean         # nuke volumes (confirm prompt)
```

## .env.example (top-level)

```
# Postgres
POSTGRES_USER=petwalker
POSTGRES_PASSWORD=changeme
POSTGRES_DB=petwalker
DATABASE_URL=postgres://petwalker:changeme@localhost:5432/petwalker

# Redis
REDIS_PASSWORD=changeme
REDIS_URL=redis://:changeme@localhost:6379

# pgAdmin
[email protected]
PGADMIN_PASSWORD=changeme

# API
API_PORT=3001
JWT_SECRET=replace-me
JWT_EXPIRES_IN=7d

# AWS / Cognito
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_CLIENT_SECRET=
COGNITO_DOMAIN=                     # https://<prefix>.auth.<region>.amazoncognito.com

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Expo Push
EXPO_ACCESS_TOKEN=

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:3001
```

## Real-time architecture

- **GPS tracking** — Expo client emits position over WebSocket (`/ws/tracking`), API gateway publishes to Redis channel `walk:{id}`, owner client subscribes via WS to same channel. Pings batch-write to `gps_pings` every N seconds.
- **Chat** — same pattern, room key `booking:{id}:chat`. Messages persisted on send, dropped to subscribers via Redis fanout. Unread counters in Redis hash.

## Auth strategy

**Backend does NOT implement authentication. Backend only accepts authorized calls.**

- **Cognito does everything auth-related.** Sign-up, confirm, sign-in, refresh, sign-out, MFA, password reset, email verification — all happen client-side against Cognito's own API (`@aws-amplify/auth` on web; `@aws-amplify/auth` or `amazon-cognito-identity-js` on mobile). We never proxy any of these through our backend.
- Once the client has a valid Cognito ID token, it sends it to the API as `Authorization: Bearer <id_token>`.
- Backend `CognitoGuard` verifies the JWT via `aws-jwt-verify` (JWKS auto-cached) and rejects with 401 otherwise. On the first authenticated request, `AuthService.upsertUser()` creates a row in `users` keyed by `cognito_sub` — that's the only mutation in the auth path. After that, `cognito_sub` is the join key everywhere.
- The backend has exactly **one** auth-related endpoint: `GET /auth/me`. There is no `/auth/sign-up`, `/auth/sign-in`, `/auth/refresh`, `/auth/confirm` — and there never will be.
- We never see passwords. Cognito owns the credential lifecycle.

## Shared package — `@petwalker/shared`

Single Node module imported by web, mobile, and backend. Layout:

```
shared/src/
├── enums/                  # UserRole, BookingStatus, PaymentStatus, ChatEventType, etc.
├── interfaces/             # User, Pet, Walker, Booking, Walk, Message, Review, Payment...
├── dto/                    # Request/response DTOs (zod schemas + inferred TS types)
├── classes/                # Domain helpers (e.g. Money, GeoPoint, Polyline)
├── api/                    # Typed API client (fetch-based, runs in browser + RN)
└── index.ts                # Barrel
```

- Built with `tsup` to ESM + CJS + .d.ts so it works in Next.js, Expo, and Nest.
- Zod schemas double as runtime validators (web forms, mobile forms, API DTOs).
- Web imports `@petwalker/shared` directly; Expo uses Metro's `extraNodeModules` workaround for monorepo resolution.

## Phased rollout

| # | Phase             | Output                                                                          |
| - | ----------------- | ------------------------------------------------------------------------------- |
| 1 | Monorepo bootstrap | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, base `tsconfig`, `.gitignore`, Makefile |
| 2 | Infra              | `docker-compose.yml`, postgres configs, init SQL, pgadmin servers.json, `.env.example`     |
| 3 | Drizzle in backend | `backend/drizzle.config.ts`, `backend/src/db/{schema,client,migrate,seed}`                 |
| 4 | API skeleton       | NestJS + Fastify, env config, health endpoint, auth module stub, Drizzle wired via DI      |
| 5 | Web skeleton       | Next.js app router shell, auth pages stub, API client from `@petwalker/shared`             |
| 6 | Mobile skeleton    | Expo app, navigation (expo-router), auth flow stub, API client                             |
| 7 | Domain modules     | bookings → tracking → chat → reviews → payments → notifications (in this order)            |
| 8 | CI                 | GitHub Actions: typecheck, lint, test, drizzle migrations dry-run                          |

## Decisions (locked in 2026-05-05)

| # | Question                          | Decision                                                       |
| - | --------------------------------- | -------------------------------------------------------------- |
| 1 | Cognito timing                    | **From day 1** — no local JWT path                             |
| 2 | Polyline / geo storage            | **jsonb** — Haversine in TS, no PostGIS                        |
| 3 | Web scope                         | **Full owner/walker portal** (not just marketing)              |
| 4 | Hosting                           | **AWS** — ECS/Fargate (api), Amplify or S3+CF (web), RDS, ElastiCache |
| 5 | Shared TS module across web+mobile| **`@petwalker/shared`** — single package: interfaces, enums, classes, types, zod, API client |
