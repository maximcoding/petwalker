# petwalker

Two-sided dog walker marketplace. Solo project.

- **backend** — NestJS 10 on Fastify
- **web** — Next.js 14 (App Router), full owner/walker portal
- **mobile** — Expo (React Native), primary client
- **shared** — `@petwalker/shared`: TS interfaces, enums, classes, zod schemas, API client (used by all three)
- **infra** — docker-compose: postgres + redis + pgadmin
- **auth** — AWS Cognito (User Pool) from day 1
- **payments** — Stripe Connect

## Repo layout

```
petwalker/
├── backend/         NestJS + Fastify (Drizzle lives in backend/src/db)
├── web/             Next.js
├── mobile/          Expo
├── shared/          @petwalker/shared
└── infra/           docker-compose, postgres, redis, pgadmin
```

## Source of truth

- **App contracts (enums, interfaces, DTOs):** `@petwalker/shared` only.
- **Database schema:** `@petwalker/db` (Drizzle) only. Migrations in `db/drizzle/migrations/` are the authority. `infra/postgres/init/` only contains the postgres extensions bootstrap (`pgcrypto`, `citext`).
- **Dev seed:** `db/src/seed.ts` only.

Drizzle `pgEnum` definitions import value lists from `@petwalker/shared/enums`, so adding an enum value is a one-line change there. Drizzle inferred row types are suffixed `Row` (e.g. `UserRow`) so they don't shadow the shared `User` interface.

## Getting started

```bash
# 1. Install deps
pnpm install

# 2. Copy env (edit secrets)
cp .env.example .env

# 3. First-time bootstrap (containers up + migrate + seed)
make bootstrap

# 4. Run all dev servers (web + backend + mobile in parallel)
pnpm dev
```

See [PLAN.md](./PLAN.md) for the full architecture and phased rollout.

## Operational runbooks

- [Payments — Stripe Connect + Apple Pay / Google Pay](./docs/payments.md) — moving from dev mock to real Stripe (test → live), enabling wallet payments, production hardening checklist.

## Make targets

```
make bootstrap   # first-time setup: up + migrate + seed
make up          # docker compose up -d (just containers)
make down        # stop + remove
make logs s=backend
make db-shell    # psql
make db-migrate  # run drizzle migrations
make db-seed     # run TS seed
make db-generate # drizzle-kit generate (after schema change)
make db-reset    # drop & recreate db, then migrate + seed (destructive)
make pgadmin     # print pgadmin URL
make clean       # nuke volumes (confirm)
```
