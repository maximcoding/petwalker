# @petwalker/backend

NestJS 10 on Fastify. Cognito auth via `aws-jwt-verify`, Drizzle/Postgres, Redis pub/sub.

> **Status:** scaffolded (Phase 5 will populate modules and bootstrap).

Planned layout:

```
backend/src/
├── modules/
│   ├── auth/             Cognito guard, AuthService.upsertUser
│   ├── users/            owners + walkers
│   ├── pets/
│   ├── bookings/
│   ├── tracking/         WS gateway, Redis pub/sub, polyline persist
│   ├── chat/             WS gateway per booking room
│   ├── reviews/
│   ├── payments/         Stripe Connect, webhooks
│   └── notifications/    Expo push
├── common/               filters, interceptors, decorators, pipes
├── config/               env validation (zod), config namespaces
└── main.ts               Fastify bootstrap
```
