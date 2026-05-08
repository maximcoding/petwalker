# petwalker

Two-sided dog-walker / pet-services marketplace. Owners book providers across 11 service categories (walking, sitting, daycare, boarding, grooming, training, photography, veterinary, fitness, massage & wellness, senior care). Providers publish weekly availability or fixed appointment slots; iCal feeds keep external busy times in sync.

Solo project. Web + mobile + API in a single pnpm workspace.

## Stack

- **shared** — `@petwalker/shared`: TS types, enums, zod DTOs, API client (consumed by all three apps)
- **backend** — NestJS 10 on Fastify, Drizzle ORM on Postgres 16, Redis 7
- **web** — Next.js 14 App Router, TanStack Query, react-virtuoso, react-i18next, Tailwind
- **mobile** — Expo (React Native), expo-router, Stripe RN
- **infra** — `docker-compose` for Postgres, Redis, pgAdmin, MinIO (dev S3), cognito-local (dev Cognito)
- **auth** — AWS Cognito in production, [`cognito-local`](https://github.com/jagregory/cognito-local) in dev
- **payments** — Stripe Connect, with an in-process dev mock for local work

## Source of truth

- **App contracts** (enums, interfaces, DTOs) — `@petwalker/shared` only.
- **Database schema** — Drizzle, in `backend/src/db/schema/`. Migrations in `backend/drizzle/migrations/` are authoritative. `infra/postgres/init/` only seeds the `pgcrypto` + `citext` extensions.
- **Dev seeds** — `backend/src/db/seed.ts` (small fixtures) and `backend/src/db/bulk-seed.ts` (10K providers, 50K pets, 50K bookings).

Drizzle `pgEnum` definitions import value lists from `@petwalker/shared/enums`, so adding an enum value is a one-line change there. Drizzle inferred row types are suffixed `Row` (e.g. `UserRow`) so they don't shadow the shared `User` interface.

## Repo layout

```
petwalker/
├── shared/         @petwalker/shared
├── backend/        NestJS + Fastify (Drizzle in backend/src/db)
├── web/            Next.js
├── mobile/         Expo
├── infra/          docker-compose, postgres conf, cognito-local seed
└── docs/           operational runbooks (payments, etc.)
```

## Prereqs

- **Node** ≥ 20.11
- **pnpm** ≥ 9.12 (`corepack enable && corepack use pnpm@9.12.0`)
- **Docker Desktop** (or compatible) for the local Postgres/Redis/MinIO/pgAdmin/cognito-local
- **GNU make** for the helper targets (`make bootstrap`, etc.)

## First-time setup

```sh
git clone <repo> dogwalk
cd dogwalk

cp .env.example .env             # defaults work for local dev
pnpm install
make bootstrap                   # up containers + build shared + migrate + seed
```

`make bootstrap` runs the small fixture seed (a handful of rows). For a realistic dataset run the bulk seed afterwards:

```sh
pnpm --filter @petwalker/backend db:bulk-seed
```

That's what creates the Olivia test owner used everywhere below, plus 10K providers / 50K pets / 50K bookings. Override the sizing with env:

```sh
NUM_PROVIDERS=100 NUM_PETS=20 NUM_BOOKINGS=300 \
  pnpm --filter @petwalker/backend db:bulk-seed
```

## Daily dev loop

Run any (or all) of the three apps. Each is independent — start whatever you're working on:

```sh
pnpm --filter @petwalker/backend dev      # http://localhost:3001
pnpm --filter @petwalker/web     dev      # http://localhost:3030
pnpm --filter @petwalker/mobile  dev      # Expo dev tools
```

Or all at once:

```sh
pnpm dev                                  # turbo run dev --parallel
```

### Test account

Created by `db:bulk-seed`. Sign in via http://localhost:3030/sign-in or the mobile app:

| | |
|---|---|
| Email    | `olivia@petwalker.test` |
| Password | `Password123!` |

Olivia is seeded as an **owner** with 50K pets. Switch her role to **Both** in *Profile → Role* to test the provider side too — then add availability + offerings + a service address from the same screen.

### Local URLs

| Service       | URL                              | Notes |
|---------------|----------------------------------|---|
| Web           | http://localhost:3030            | |
| Backend API   | http://localhost:3001            | |
| pgAdmin       | http://localhost:5050            | Auto-connects to the petwalker DB |
| MinIO console | http://localhost:9001            | dev S3 |
| cognito-local | http://localhost:9229            | preloaded user pool `local_petwalker` |

pgAdmin / MinIO credentials are in `.env`. The Postgres container also forwards to `localhost:5432` for direct `psql` access.

## Useful scripts

Run from the repo root unless noted.

| Command                                              | What |
|------------------------------------------------------|---|
| `pnpm install`                                       | Install workspace deps |
| `pnpm dev`                                           | Start backend + web + mobile in parallel |
| `pnpm typecheck`                                     | Typecheck every package |
| `pnpm lint`                                          | Lint every package |
| `pnpm test`                                          | Vitest across the workspace |
| `pnpm build`                                         | Build all packages |
| `pnpm --filter @petwalker/shared build`              | Rebuild shared after editing types/DTOs |
| `pnpm --filter @petwalker/backend db:migrate`        | Apply Drizzle migrations |
| `pnpm --filter @petwalker/backend db:generate`       | Generate a new migration from schema diff |
| `pnpm --filter @petwalker/backend db:studio`         | Drizzle Studio (web UI for the DB) |
| `pnpm --filter @petwalker/backend db:seed`           | Small fixture seed |
| `pnpm --filter @petwalker/backend db:bulk-seed`      | Heavy seed (10K / 50K / 50K) |

### Make targets

```
make bootstrap   # first-time: up + build shared + migrate + seed
make up          # docker compose up -d
make down        # stop + remove (keep volumes)
make restart     # down + up
make logs s=backend
make ps          # list services
make db-shell    # psql in the postgres container
make db-migrate  # drizzle migrations
make db-seed     # small fixture seed
make db-generate # drizzle-kit generate (after schema change)
make db-studio   # drizzle studio
make db-reset    # DROP + CREATE + migrate + seed (destructive)
make db-fresh    # nuke postgres volume, regenerate migrations, bootstrap (DESTRUCTIVE)
make pgadmin     # print pgadmin URL + creds
make redis-cli   # redis-cli inside the container
make clean       # nuke all volumes (confirm prompt)
```

## Operational runbooks

- [Payments — Stripe Connect + Apple Pay / Google Pay](./docs/payments.md) — moving from dev mock to real Stripe (test → live), enabling wallet payments, production hardening checklist.

## Troubleshooting

**`db:bulk-seed` fails with "column does not exist"**
The DB volume wasn't actually wiped between schema changes. List remaining volumes and remove by hand:
```sh
docker compose -f infra/docker-compose.yml down -v
docker volume ls | grep petwalker
docker volume rm <whatever's left>
make up
make db-migrate
pnpm --filter @petwalker/backend db:bulk-seed
```

**Backend says `Invalid or expired token` immediately after sign-in**
cognito-local sometimes drifts after a restart. Open `infra/cognito-local/.cognito/db/local_petwalker.json`, confirm `AccessTokenValidity: 24` with `TokenValidityUnits.AccessToken: "hours"`, then sign out + back in.

**Web shows `Module not found: @petwalker/shared/...` after a `pnpm install`**
The shared package's `dist/` may be stale:
```sh
pnpm --filter @petwalker/shared build
```

**Stripe-related errors in dev**
`STRIPE_SECRET_KEY` is empty in `.env.example` — that's intentional. The backend uses a mock Stripe service in dev (`APP_ENV=dev`) that auto-completes onboarding and payments. Set real keys only when you flip to `APP_ENV=prod`. See [docs/payments.md](./docs/payments.md).

**Expo: "Unable to resolve module @petwalker/shared/..." after editing shared types**
Metro caches aggressively. From `mobile/`:
```sh
pnpm start --clear
```

**`docker compose down -v` from the repo root says "no configuration file"**
The compose file lives in `infra/`. Use `make down` / `make clean`, or pass `-f infra/docker-compose.yml` explicitly.

## What's next

See [PLAN.md](./PLAN.md) for the architecture and phased rollout. Big in-flight tracks: calendar grid view for slot-mode bookings, recurring bookings, range mode (boarding), provider-side instructions + booking agreements, M5 (reviews + push), M6 (CI + AWS deploy).

## License

Private / proprietary. Not for redistribution.
