# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev        # watch mode (sets NODE_ENV=development)

# Build
npm run build            # tsc compile to dist/

# Test
npm run test             # unit tests (sets NODE_ENV=testing)
npm run test:e2e         # e2e tests
npm run test:cov         # with coverage
# Run a single test file:
npx jest src/modules/auth/auth.service.spec.ts

# Lint / Format
npm run lint             # eslint --fix
npm run format           # prettier --write

# Database seeding
npm run seed             # build + seed
npm run seed:refresh     # re-seed without rebuild
```

## Environment Setup

Create a `.env` file (see README.md for the full variable list). Key variables:

- `MONGO_DB_URI` — MongoDB Atlas connection string
- `JWT_SECRET_KEY`, `JWT_SECRET_TOKEN`, `JWT_SECRET_TOKEN_EXP`
- `APP_PORT`, `SECRET_COOKIE_SESSION`
- AWS S3: `AWS_PUBLIC_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_EMAIL`
- `TROTTLER_TTL`, `TROTTLER_LIMIT`

Local services (MongoDB + Redis) can be started via Docker:
```bash
docker-compose up -d
```

Swagger UI is available at `http://localhost:<PORT>/api` after the server starts.

## Architecture

NestJS REST API using MongoDB (Mongoose) with JWT + Passport session auth.

### Module structure (`src/modules/`)

| Module | Responsibility |
|---|---|
| `auth` | Registration, login (phone/email), JWT signing, password reset flow, logout |
| `users` | User CRUD, complaints |
| `properties` | Property listings with rooms, visits, filtering, sorting |
| `categories` | Property categories |
| `files` | AWS S3 upload/download for images, video, audio, documents |
| `cache` | `CacheService` wraps NestJS `CACHE_MANAGER`; used for JWT whitelist/blacklist |
| `database` | Mongoose connection provider |
| `email` | SendGrid transactional emails (confirmation, reset password) |
| `sms` | Twilio SMS (phone verification codes) |
| `recent` | Recently viewed properties |
| `article` | Articles/blog posts |

### Authentication flow

1. Register → sends SMS verification code (Twilio) + email confirmation link (SendGrid)
2. Login by phone or email → issues HS384 JWT, stores token in MongoDB-backed cache whitelist
3. JWT strategy (`passport-jwt`) validates token and checks whitelist on every request
4. Sessions backed by MongoDB (`connect-mongo`); Passport serializes user into session
5. Logout → blacklists the JWT token in cache

### Patterns

- **Providers pattern**: Mongoose models are injected via custom providers (e.g., `authProviders`, `files.providers.ts`). Model tokens are defined in `src/enums/model.enum.ts`.
- **Payloads**: DTOs are named `*Payload` and live in `payload/` or `payloads/` subdirectories; validated with `class-validator`.
- **Global interceptors** (registered in `main.ts`): `LoggingInterceptor`, `ExcludeNullInterceptor`, `TimeoutInterceptor`, `TransformDataInterceptor`.
- **Global filters**: `MongoExceptionFilter`, `AllExceptionsFilter`.
- **Enums**: Shared domain enums live in `src/enums/`.
- **Helpers**: Utility functions (password hashing, file limit checks, unit conversion) live in `src/helpers/`.
- **Seeders**: `nestjs-seeder`-based seeders in `src/seeders/`; entry point is `src/seeder.ts`.

### Cache

Uses `MongoCacheModule` (MongoDB-backed cache via `cache-manager-mongoose`) for the JWT token whitelist. Redis modules exist in the codebase but are commented out.
