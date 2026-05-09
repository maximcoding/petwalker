# petwalker

Two-sided dog-walker / pet-services marketplace. Owners book providers across 11 service categories (walking, sitting, daycare, boarding, grooming, training, photography, veterinary, fitness, massage & wellness, senior care). Providers publish weekly availability or fixed appointment slots; a Google Calendar OAuth integration keeps external busy times in sync.

Solo project. Web + mobile + API in a single pnpm workspace.

```
shared/    @petwalker/shared (TS contracts, API client)
backend/   NestJS 10 + Fastify · Drizzle + Postgres 16 · Redis 7
web/       Next.js 14 (App Router) · TanStack Query · Tailwind · i18next
mobile/    Expo · expo-router · Stripe RN
infra/     docker-compose (Postgres / Redis / pgAdmin / MinIO / cognito-local)
docs/      everything else — read docs/README.md
```

## Documentation

The repo root stays lean on purpose. **All project docs live under [`docs/`](./docs/).** Start with the index:

| File | What |
|---|---|
| [`docs/README.md`](./docs/README.md) | Docs folder index — read this first. |
| [`docs/architecture.md`](./docs/architecture.md) | What the system is. Tech stack, modules, DB tables, auth strategy, real-time wiring. |
| [`docs/setup.md`](./docs/setup.md) | **Single source of truth** for local dev, every env var, every external account (Postgres / Redis / S3 / Cognito / Stripe / Google Calendar / Expo Push). |
| [`docs/roadmap.md`](./docs/roadmap.md) | Milestones M1 → M6 with task breakdowns. |
| [`docs/payments.md`](./docs/payments.md) | Stripe deep-dive — dev mock → test → live, Apple/Google Pay, production hardening. |
| [`docs/google-calendar-setup.md`](./docs/google-calendar-setup.md) | "Connect Google Calendar" OAuth setup. |
| [`docs/testing.md`](./docs/testing.md) | Manual smoke-test checklist. |
| [`docs/product-brief.md`](./docs/product-brief.md) | Original product/design brief — brand, screens, component inventory. Pre-implementation. |
| [`docs/scaffold-plan.md`](./docs/scaffold-plan.md) | Historical 2026-05-05 scaffold plan + decisions log. |

## Quick start

Prereqs: Node ≥ 20.11 · pnpm ≥ 9.12 (`corepack enable && corepack use pnpm@9.12.0`) · Docker Desktop · GNU make.

```sh
git clone <repo> dogwalk
cd dogwalk
cp .env.example .env             # defaults work for local dev — zero AWS keys needed
pnpm install
make bootstrap                   # docker up + build shared + migrate + seed
pnpm dev                         # turbo runs backend + web + mobile in parallel
```

Need Stripe / Cognito / Google Calendar / S3 / push keys? See **[`docs/setup.md`](./docs/setup.md)**. Don't go service-hunting through scattered READMEs.

For a realistic dataset (Olivia + 10K providers + 50K pets + 50K bookings):

```sh
pnpm --filter @petwalker/backend db:bulk-seed
```

Override sizing with `NUM_PROVIDERS=… NUM_PETS=… NUM_BOOKINGS=…`.

### Test account

Created by `db:bulk-seed`. Sign in via http://localhost:3030/sign-in or the mobile app:

| | |
|---|---|
| Email    | `olivia@petwalker.test` |
| Password | `Password123!` |

Olivia is seeded as an **owner** with 50K pets. Switch her role to **Both** in *Profile → Role* to test the provider side too.

### Local URLs

| Service       | URL                   | Notes |
|---------------|-----------------------|---|
| Web           | http://localhost:3030 | |
| Backend API   | http://localhost:3001 | |
| pgAdmin       | http://localhost:5050 | Auto-connects to the petwalker DB |
| MinIO console | http://localhost:9001 | dev S3 |
| cognito-local | http://localhost:9229 | preloaded user pool `local_petwalker` |

pgAdmin / MinIO credentials are in `.env`. Postgres also forwards to `localhost:5432` for direct `psql`.

## Useful scripts

Run from the repo root unless noted.

| Command | What |
|---|---|
| `pnpm dev` | Backend + web + mobile in parallel |
| `pnpm typecheck` | Typecheck every package |
| `pnpm lint` | Lint every package |
| `pnpm test` | Vitest across the workspace |
| `pnpm build` | Build all packages |
| `pnpm --filter @petwalker/shared build` | Rebuild shared after editing types/DTOs |
| `pnpm --filter @petwalker/backend db:migrate` | Apply Drizzle migrations |
| `pnpm --filter @petwalker/backend db:generate` | Generate a new migration from schema diff |
| `pnpm --filter @petwalker/backend db:studio` | Drizzle Studio (web UI for the DB) |
| `pnpm --filter @petwalker/backend db:seed` | Small fixture seed |
| `pnpm --filter @petwalker/backend db:bulk-seed` | Heavy seed (10K / 50K / 50K) |

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
`STRIPE_SECRET_KEY` is empty in `.env.example` — that's intentional. The backend uses a mock Stripe service in dev (`APP_ENV=dev`) that auto-completes onboarding and payments. Set real keys only when you flip to `APP_ENV=prod`. See [`docs/setup.md`](./docs/setup.md) for the env-var matrix.

**Expo: "Unable to resolve module @petwalker/shared/..." after editing shared types**
Metro caches aggressively. From `mobile/`:
```sh
pnpm start --clear
```

**`docker compose down -v` from the repo root says "no configuration file"**
The compose file lives in `infra/`. Use `make down` / `make clean`, or pass `-f infra/docker-compose.yml` explicitly.

## License

Private / proprietary. Not for redistribution.
