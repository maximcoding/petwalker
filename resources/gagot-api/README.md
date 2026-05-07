# GagotApp REST API

REST API for GagotApp — a property listing and rental platform. Built with NestJS, MongoDB (Mongoose), JWT authentication, AWS S3 file storage, Twilio SMS, and SendGrid email.

## Prerequisites

- Node.js 14.15.1
- npm
- MongoDB (local via Docker or a MongoDB Atlas URI)

## Installation

```bash
npm install
```

Create a `.env` file in the project root:

```
MONGO_DB_URI=mongodb+srv://user:pass123@cluster0.cauco.mongodb.net/dbName?retryWrites=true&w=majority
TROTTLER_TTL=60
TROTTLER_LIMIT=10

JWT_SECRET_KEY=someSecretKey
JWT_SECRET_TOKEN=7ac814f4e59ca19d216a1043671afa683270b12dfbf1d73139b3f25ec70b8e27f0f91d575cf6e48fe2897892227851d8a5cffa417a318bd6a60f682f8bac2ee5
JWT_SECRET_TOKEN_EXP=1d

APP_PORT=3000
APP_HOST=127.0.0.1
APP_NAME=gagotapp
APP_REQUEST_TIME_OUT=30000
APP_MAX_FILE_SIZE=25000000
ALLOWED_ORIGINS=http://localhost:3000

BCRYPT_SALT=10
SECRET_COOKIE_SESSION=yoursupersecretkey
SESSION_TIME=86400000

#redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=redisuser
REDIS_PASSWORD=redispass
CACHE_TTL=180000
REDIS_URI=

#s3
AWS_PUBLIC_BUCKET_NAME=someBucketName
AWS_ACCESS_KEY_ID=somekeyId
AWS_SECRET_ACCESS_KEY=someAccessKey

#twilio
TWILIO_ACCOUNT_SID=someSID
TWILIO_AUTH_TOKEN=someTOKEN
TWILIO_PHONE_NUMBER=somephonenumber

#sendgrid email
SENDGRID_API_KEY=SG.whatever
SENDGRID_EMAIL=someemail
```

## Local Services (Docker)

Docker Compose starts MongoDB (port 27017), Mongo Express UI (port 8081), and Redis. The compose file reads from the same `.env`; you'll also need to set `DOCKER_MONGO_*` and `REDIS_*` variables listed in `docker-compose.yml`.

```bash
docker-compose up -d
```

## Running the App

```bash
# Development (watch mode)
npm run start:dev

# Build
npm run build

# Production (requires built dist/)
npm run start
```

Swagger UI is available at `http://localhost:8080/api` after the server starts.

## Database Seeding

```bash
npm run seed           # build + seed users, categories, and properties
npm run seed:refresh   # re-seed without rebuilding
```

## Authentication

1. `POST /api/auth/register` — creates an account; triggers an SMS code (Twilio) and email confirmation link (SendGrid)
2. Verify mobile: `POST /api/auth/mobile/verification`
3. Confirm email: `GET /api/auth/email/confirm?code=<code>`
4. Login: `POST /api/auth/mobile/login` — returns a Bearer JWT token
5. All protected endpoints require `Authorization: Bearer <token>`
6. `GET /api/auth/logout` — invalidates the token and clears the session

## API Modules

Full endpoint documentation is available via Swagger at `/api`. Resource groups:

| Resource | Base path |
|---|---|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Properties | `/api/properties` |
| Rooms | `/api/rooms` |
| Visits | `/api/visits` |
| Reviews | `/api/reviews` |
| Categories | `/api/categories` |
| Articles | `/api/articles` |
| Files | `/api/files` |
| Recent | `/api/recent` |

## Testing

```bash
# Unit tests
npm run test

# Single test file
npx jest src/modules/auth/auth.service.spec.ts

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Deployment (Heroku)

The `Procfile` defines `web: npm run start`. The `heroku-prebuild` and `heroku-postbuild` scripts in `package.json` handle cleaning, installing dependencies, and building automatically on each deploy.
