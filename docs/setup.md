# Setup — every key, secret, and external account

**This is the single source of truth for "what do I need to set up before this works".** If you find yourself digging through scattered READMEs to figure out where a key goes, that's a bug — open a PR against this file.

The codebase is built so that **zero external accounts are required for local development**. Every external service (Cognito, S3, Stripe, Google Calendar) has a dev mock that activates when its env vars are unset. You only graduate to real keys when you're ready to test that integration end-to-end.

> **One file rule.** Operational deep-dives live in `docs/payments.md` and `docs/google-calendar-setup.md`, but every key/credential the project consumes is listed in this file. If a new service is added, add it here too.

---

## Table of contents

1. [Local dev — zero keys](#1-local-dev--zero-keys)
2. [Service-by-service setup](#2-service-by-service-setup)
   - [Postgres](#postgres)
   - [Redis](#redis)
   - [AWS S3 (or MinIO in dev)](#aws-s3-or-minio-in-dev)
   - [AWS Cognito (auth)](#aws-cognito-auth)
   - [Stripe (payments)](#stripe-payments)
   - [Google Calendar OAuth](#google-calendar-oauth)
   - [Expo Push (mobile notifications)](#expo-push-mobile-notifications)
3. [Env-var reference matrix](#3-env-var-reference-matrix)
4. ["I want to do X" cheatsheet](#4-i-want-to-do-x-cheatsheet)
5. [Production safety guards](#5-production-safety-guards)

---

## 1. Local dev — zero keys

```bash
cp .env.example .env       # defaults already point at the dockerised stack
make bootstrap             # docker up + migrate + seed + build shared
pnpm dev                   # turbo-runs backend + web + mobile
```

After this, two things are running:

| Component | URL | Notes |
| --- | --- | --- |
| Backend | http://localhost:3001 | NestJS on Fastify |
| Web | http://localhost:3030 | Next.js |
| Postgres | localhost:5432 | docker — user `petwalker`, db `petwalker` |
| Redis | localhost:6379 | docker |
| MinIO (S3 mock) | http://localhost:9001 (console) | docker — `minioadmin` / `minioadmin` |
| cognito-local | http://localhost:9229 | docker — pool `local_petwalker` |
| pgAdmin | http://localhost:5050 | docker — `[email protected]` / `changeme_pgadmin` |

Sign up via the web UI; cognito-local auto-confirms accounts. **No real cloud accounts touched.**

The "Connect Google Calendar" button on `/profile/personal` shows a yellow "not configured" notice until you wire Google OAuth; the Stripe pay flow uses the in-process mock; Apple/Google Pay are no-ops on web. Everything else works.

---

## 2. Service-by-service setup

### Postgres

| | |
| --- | --- |
| **Used for** | All persistent data (users, bookings, payments, calendar tokens, …). |
| **Dev** | docker-compose ships a Postgres 16 with `pgcrypto` + `citext` extensions pre-loaded. |
| **Prod** | Any Postgres 14+. RDS / Supabase / Neon / Fly Postgres all work — Drizzle's libpq driver is vanilla. |
| **Env vars** | `DATABASE_URL` (backend) |
| **Setup** | Set `DATABASE_URL` to the prod connection string. Run `cd backend && npx drizzle-kit migrate` to apply migrations. Don't forget to enable `pgcrypto` and `citext` extensions on first deploy — `infra/postgres/init/01-extensions.sql` shows the SQL. |

### Redis

| | |
| --- | --- |
| **Used for** | Currently: nothing critical (reserved for rate limiting + WS pub/sub). |
| **Dev** | docker-compose ships Redis 7. |
| **Prod** | Any Redis 6+. ElastiCache / Upstash / Fly Redis. |
| **Env vars** | `REDIS_URL` (backend) |
| **Setup** | Set `REDIS_URL`. No additional config. |

### AWS S3 (or MinIO in dev)

| | |
| --- | --- |
| **Used for** | Pet photos, provider avatars (uploaded via signed URL). |
| **Dev** | MinIO inside docker-compose with bucket `petwalker-pets-dev` auto-created. Same S3 SDK code path; only the endpoint URL differs. |
| **Prod** | Real AWS S3. Create a bucket and an IAM user (or instance-profile) with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on that bucket. |
| **Env vars (backend)** | `AWS_REGION`, `AWS_S3_REGION`, `AWS_S3_BUCKET_PETS`, `AWS_S3_ENDPOINT` (unset in prod), `AWS_S3_FORCE_PATH_STYLE` (unset in prod), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| **Setup** | Get IAM credentials → set `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`. Set `AWS_S3_BUCKET_PETS` to your bucket. **Unset** `AWS_S3_ENDPOINT` so the SDK uses real AWS. |

### AWS Cognito (auth)

| | |
| --- | --- |
| **Used for** | All user authentication. Sign up, sign in, federated identity (Google, Apple, etc.). The backend verifies Cognito-issued ID tokens via JWKS. |
| **Dev** | [`cognito-local`](https://github.com/jagregory/cognito-local) — a docker container that speaks Cognito's HTTP API. Pool `local_petwalker` and client `petwalker_local_client` are pre-loaded; sign up auto-confirms. **No AWS account needed.** |
| **Prod** | Real AWS Cognito User Pool. |
| **Env vars (backend)** | `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET` (optional), `COGNITO_DOMAIN`, `COGNITO_ENDPOINT` (unset in prod), `AWS_REGION` |
| **Env vars (web)** | `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_ENDPOINT` (unset in prod), `NEXT_PUBLIC_AWS_REGION` |
| **Env vars (mobile)** | `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_CLIENT_ID`, `EXPO_PUBLIC_COGNITO_ENDPOINT` (unset in prod), `EXPO_PUBLIC_AWS_REGION` |
| **Setup (production)** | 1. Cognito console → Create User Pool. Default settings work; pick a unique pool name. <br> 2. App Client: type **Public client**, no secret if you're using the JS Amplify SDK. Tick "Cognito user pool sign-in" + any federated providers you want. <br> 3. Hosted UI domain: pick a `<prefix>.auth.<region>.amazoncognito.com` if you want federated sign-in. <br> 4. Set `COGNITO_USER_POOL_ID` (`us-east-1_XXXXX` form) and `COGNITO_CLIENT_ID` in env. **Unset `COGNITO_ENDPOINT`** so the SDK uses real AWS. <br> 5. Set the matching `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` vars. |
| **Setup (Google federated sign-in)** | In the User Pool: *Sign-in experience → Federated identity provider sign-in → Add identity provider → Google.* Provide the Google OAuth client ID + secret (from Google Cloud Console — see Google Calendar section, you can reuse the same OAuth client). Map `email`, `email_verified`, `name`, `picture` to user-pool attributes. |

### Stripe (payments)

| | |
| --- | --- |
| **Used for** | Booking payments (Stripe Connect — owners pay providers, platform takes a cut), saved cards, refunds. Mobile uses native PaymentSheet (Apple/Google Pay). |
| **Dev** | In-process `StripeDevService` — fake `acct_dev_*`, `pi_dev_*`, `ch_dev_*` IDs, EventEmitter "webhooks". **No Stripe account needed for booking-flow dev.** |
| **Prod** | Real Stripe (test mode → live mode). |
| **Env vars (backend)** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` (optional) |
| **Env vars (web)** | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Env vars (mobile)** | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_MERCHANT_ID` (Apple Pay only) |
| **Setup** | Quick path: get `sk_test_…` and `pk_test_…` from <https://dashboard.stripe.com/test/apikeys>, add a webhook endpoint at `/payments/webhook` and copy `whsec_…`. **For full step-by-step including Apple Pay merchant cert, Xcode entitlement, Google Pay activation, and production hardening → see [`docs/payments.md`](payments.md).** |

### Google Calendar OAuth

| | |
| --- | --- |
| **Used for** | Provider-side "Connect Google Calendar" — pulls busy windows from the provider's primary calendar to exclude already-busy times from booking slots. Replaces the v1 iCal-URL form. |
| **Dev** | Hidden behind a "not configured" notice when env vars are unset — nothing else degrades. |
| **Prod** | Backend acts as its own Google OAuth client (separate from Cognito's Google IdP, even though both can live in the same Google Cloud project). |
| **Env vars (backend)** | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_FRONTEND_RETURN_URL` |
| **Env vars (web/mobile)** | None — the OAuth handshake happens entirely server-side. |
| **Setup** | 1. <https://console.cloud.google.com/apis/credentials> → enable **Google Calendar API**. <br> 2. OAuth consent screen → external → add scopes `auth/calendar.freebusy`, `auth/userinfo.email`, `openid`. <br> 3. Credentials → Create OAuth Client ID → Web application → register redirect URI `https://api.your-domain.com/auth/google-calendar/callback` (and `http://localhost:3001/...` for dev). <br> 4. Drop client ID + secret into backend `.env`. **Full walkthrough including consent-screen wording and smoke test → [`docs/google-calendar-setup.md`](google-calendar-setup.md).** |

### Expo Push (mobile notifications)

| | |
| --- | --- |
| **Used for** | Booking status updates, chat messages → push to mobile. |
| **Dev** | Mocked — `console.log`'d locally. Set the env to enable real pushes against your Expo project. |
| **Prod** | [Expo Access Token](https://docs.expo.dev/push-notifications/sending-notifications/#http2-api). |
| **Env vars (backend)** | `EXPO_ACCESS_TOKEN` |
| **Setup** | <https://expo.dev/accounts/.../settings/access-tokens> → Create token. Drop into `.env`. Mobile app must already be tied to an Expo project (`app.json` has the `expo.projectId`). |

---

## 3. Env-var reference matrix

Where each env var lives, when you need it, and what flips when it's set.

| Env var | App | Required when | Effect |
| --- | --- | --- | --- |
| `DATABASE_URL` | backend | always | Postgres connection. |
| `REDIS_URL` | backend | always | Redis connection. |
| `API_PORT` | backend | rarely | HTTP listen port. Default 3001. |
| `PUBLIC_API_URL` | backend | always | Used to compose CORS-ok URLs. |
| `NODE_ENV` | backend | always | Node optimisations. `production` requires `APP_ENV=prod`. |
| `APP_ENV` | backend | always | `dev` (mocks) or `prod` (real AWS). Misconfig is a hard boot failure. |
| `AWS_REGION` | backend | always | All AWS SDKs. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | backend | non-IAM-role envs | Credentials for S3 and Cognito. Skip if running on EC2/ECS with an instance role. |
| `AWS_S3_*` | backend | always | Bucket + region + (dev only) MinIO endpoint. |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | backend, web, mobile | always | Pool + app-client to verify tokens against. |
| `COGNITO_ENDPOINT` | backend, web, mobile | dev only | Points at cognito-local. **Must be unset in prod.** |
| `STRIPE_SECRET_KEY` | backend | real Stripe | Switches `StripeService` factory from dev mock to `StripeRealService`. |
| `STRIPE_WEBHOOK_SECRET` | backend | real Stripe | `/payments/webhook` HMAC-verifies `Stripe-Signature`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | web | real Stripe | Stripe Elements card UI. |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | mobile | real Stripe | PaymentSheet works on device. |
| `EXPO_PUBLIC_STRIPE_MERCHANT_ID` | mobile | Apple Pay | Apple Pay row in PaymentSheet. |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | backend | Google Calendar feature | Frontend "Connect Google Calendar" button becomes active. |
| `GOOGLE_OAUTH_FRONTEND_RETURN_URL` | backend | Google Calendar feature | Where the backend bounces the user after consent. |
| `EXPO_ACCESS_TOKEN` | backend | mobile push | Real push notifications via Expo. |

---

## 4. "I want to do X" cheatsheet

| You want to … | Do this |
| --- | --- |
| Develop locally with no internet | Nothing — defaults work. `make bootstrap && pnpm dev`. |
| Run real Postgres (not the docker one) | Set `DATABASE_URL` to the prod URL. `npx drizzle-kit migrate`. |
| Switch from MinIO to real S3 | Set IAM keys + bucket; **unset** `AWS_S3_ENDPOINT`. |
| Test against real Cognito | Set `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` + the matching `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`; **unset** `COGNITO_ENDPOINT`. |
| Test real Stripe payments | Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Run `stripe listen --forward-to localhost:3001/payments/webhook`. Full guide → `docs/payments.md`. |
| Enable "Connect Google Calendar" | Create Web OAuth client at `console.cloud.google.com/apis/credentials`, drop client id/secret into `.env`. Full guide → `docs/google-calendar-setup.md`. |
| Enable Apple Pay (mobile) | Apple Merchant ID + cert + Xcode entitlement + custom dev client. → `docs/payments.md` §4. |
| Enable Google Pay (mobile) | Set `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, build Android. → `docs/payments.md` §3. |
| Enable mobile push notifications | Set `EXPO_ACCESS_TOKEN`. |
| Ship to production | Set `NODE_ENV=production` AND `APP_ENV=prod`. The boot guard refuses to start if any dev endpoint env (`COGNITO_ENDPOINT`, `AWS_S3_ENDPOINT`) is still set. |

---

## 5. Production safety guards

`backend/src/config/env.ts` actively refuses to boot when:

- `NODE_ENV=production` but `APP_ENV` ≠ `prod` — guards against shipping the dev mock to prod.
- `APP_ENV=prod` and `COGNITO_ENDPOINT` is set — would point at cognito-local in prod.
- `APP_ENV=prod` and `AWS_S3_ENDPOINT` is set — would point at MinIO in prod.
- `APP_ENV=prod` with default Cognito IDs (`local_petwalker`, `petwalker_local_client`) — placeholder values.

Failures are logged with a bullet list of every misconfig and the process exits non-zero. There is no "half-prod" state.

---

## How to add a new external service

1. Add its env vars to `backend/src/config/env.ts` (with a comment explaining what flips when they're set).
2. Add an entry to `.env.example` with placeholder values + a one-line comment.
3. Add a row to the **Service-by-service setup** section above.
4. Add a row to the **Env-var reference matrix**.
5. Add a row to the **"I want to do X" cheatsheet** if relevant.
6. If the setup has more than ~5 steps, write a deep-dive runbook at `docs/<service>-setup.md` and link from the table above. Otherwise, inline it.
