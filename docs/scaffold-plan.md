# Original scaffold plan (2026-05-05)

> Historical artifact — kept for the decisions log. Anything about *how the system actually is today* lives in [`architecture.md`](./architecture.md). This file only documents what was decided up front and the phased order of rollout.

For the **current** stack, layout, modules, and auth strategy → [`architecture.md`](./architecture.md).
For env / external services → [`setup.md`](./setup.md).

---

## Original repo layout (planned)

The shape we scaffolded toward. Today's tree differs in places (e.g. `docs/` was added later; `infra/postgres/init/` only ships extension SQL now since Drizzle migrations are authoritative for schema). Kept here for git-archaeology.

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
├── Makefile
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Phased rollout (executed)

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

Subsequent work (Stripe payments deep-dive, Google Calendar OAuth migration, IA refactor, etc.) is tracked in [`roadmap.md`](./roadmap.md).

---

## Decisions log (locked 2026-05-05)

The five up-front bets that shaped everything since. Future decisions of similar weight should append rows here with a date stamp rather than quietly diverge.

| # | Question                          | Decision                                                       |
| - | --------------------------------- | -------------------------------------------------------------- |
| 1 | Cognito timing                    | **From day 1** — no local JWT path                             |
| 2 | Polyline / geo storage            | **jsonb** — Haversine in TS, no PostGIS                        |
| 3 | Web scope                         | **Full owner/walker portal** (not just marketing)              |
| 4 | Hosting                           | **AWS** — ECS/Fargate (api), Amplify or S3+CF (web), RDS, ElastiCache |
| 5 | Shared TS module across web+mobile| **`@petwalker/shared`** — single package: interfaces, enums, classes, types, zod, API client |
