# TODO_TEST

Manual smoke tests. Tick as you verify. Append new tasks here as features land.

---

## Prereqs (dev mode — zero AWS keys required)

`APP_ENV=dev` (default). Docker-compose runs MinIO (S3-compatible) on `:9000`/`:9001`
and cognito-local on `:9229` with a preloaded User Pool (id `local_petwalker`,
client `petwalker_local_client`). Amplify and the backend talk Cognito + S3
protocols against these — the same code that hits real AWS in prod.

- [ ] `cp .env.example .env` (defaults are dev-ready)
- [ ] `make up` brings up: postgres, redis, pgadmin, minio, cognito-local, all healthy
  - `make ps` shows `(healthy)` for postgres, redis, minio, cognito-local
- [ ] `make bootstrap` runs migrations + seed; backend boots without env errors
- [ ] MinIO console reachable at http://localhost:9001 (login `minioadmin` / `minioadmin`); bucket `petwalker-pets-dev` is auto-created on backend boot
- [ ] cognito-local API responds: `curl http://localhost:9229/local_petwalker/.well-known/jwks.json` returns JWKS
- [ ] Sign up via web at http://localhost:3000 — Amplify creates user in cognito-local. Confirm code is printed to the cognito-local container logs (`make logs s=cognito-local`)
- [ ] After sign-in, `localStorage` contains Amplify tokens; token works against backend

---

## M1 · Backend skeleton

- [ ] `GET /health` returns `{ "status": "ok", "checks": { "postgres": "ok" } }` (no auth required)
  ```bash
  curl http://localhost:3001/health
  ```

- [ ] `GET /auth/me` without token → 401
  ```bash
  curl -i http://localhost:3001/auth/me
  ```

- [ ] `GET /auth/me` with valid Bearer → returns `User`, creates row in `users` table on first call
  ```bash
  curl http://localhost:3001/auth/me -H "Authorization: Bearer $ID_TOKEN"
  make db-shell -c "SELECT id, email, role, cognito_sub FROM users;"
  ```

- [ ] `GET /auth/me` with invalid Bearer → 401, log shows `token rejected`

---

## M1 · Web (Next.js)

- [ ] `http://localhost:3000` shows landing page with Sign in / Create account
- [ ] `/sign-up` → fill form → `/confirm` page → enter code from email → redirect to `/sign-in`
- [ ] `/sign-in` → enter creds → redirect to `/me`
- [ ] `/me` shows JSON of current user (came from backend `GET /auth/me`)
- [ ] `Sign out` button clears Cognito session and redirects to landing
- [ ] Protected route — visit `/me` while signed out → redirects to `/sign-in`

---

## M1 · Mobile (Expo)

- [ ] `pnpm --filter @petwalker/mobile dev` opens dev server, QR scannable
- [ ] In Expo Go (or simulator): redirect to `/(auth)/sign-in` when anon
- [ ] Sign-up flow → confirm code → sign-in → tabs (`Home`, `Bookings`, `Profile`)
- [ ] Profile tab shows fields from backend `/auth/me` (name/email/role/phone)
- [ ] Sign out from Profile tab → back to `/(auth)/sign-in`
- [ ] On physical device: `EXPO_PUBLIC_API_URL` points to your machine's LAN IP, not `localhost`

---

## M2 · Step 1 — Users module

> **NOTE — schema renamed.** `walker_profiles` → `service_provider_profiles`,
> role enum `'walker'` → `'provider'`, prices moved to `provider_service_offerings`,
> `bookings.walker_id` → `bookings.provider_id`, added `bookings.service_type`.
> Re-generate Drizzle migrations and `make db-reset` before re-running tests.

### Profile

- [ ] `PATCH /users/me` with `fullName` + `phone` updates the row
  ```bash
  curl -X PATCH http://localhost:3001/users/me \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"fullName":"Olivia Owner","phone":"+15555550111"}'
  ```
- [ ] `PATCH /users/me { "role": "provider" }` flips role to `provider`

### Service-provider profile (no prices here)

- [ ] `GET /users/me/service-profile` initially returns `null`
- [ ] `PUT /users/me/service-profile` upserts:
  ```bash
  curl -X PUT http://localhost:3001/users/me/service-profile \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"bio":"Marathon runner","serviceRadiusKm":8,"baseLat":40.7306,"baseLng":-73.9352}'
  ```
- [ ] Re-PUT with partial body updates only those fields
- [ ] Validation: `serviceRadiusKm: -1`, `baseLat: 999` → 400 with zod issues

### Per-service offerings (price-per-service)

- [ ] `GET /users/me/offerings` initially `[]`
- [ ] `PUT /users/me/offerings/walking` adds a walking offering
  ```bash
  curl -X PUT http://localhost:3001/users/me/offerings/walking \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"serviceType":"walking","hourlyRateCents":2500,"active":true}'
  ```
- [ ] Add a second `grooming` offering with different price → both visible in `GET /users/me/offerings`
- [ ] PUT same `serviceType` again → updates price, doesn't duplicate
- [ ] `DELETE /users/me/offerings/walking` → 204; `GET` shows only grooming
- [ ] Calling offerings without a service-profile first → service auto-creates the empty profile (idempotent)
- [ ] Without Bearer → 401

---

## M2 · Step 2 — Pets module + S3 upload

### Pets CRUD

- [ ] `GET /pets` empty array on first call
  ```bash
  curl http://localhost:3001/pets -H "Authorization: Bearer $ID_TOKEN"
  ```
- [ ] `POST /pets` creates one
  ```bash
  curl -X POST http://localhost:3001/pets \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Biscuit","species":"dog","breed":"Golden","weightKg":28.5,"ageYears":4}'
  ```
  Capture `id` for next steps: `PET_ID=...`
- [ ] `GET /pets/$PET_ID` returns the pet
- [ ] `PATCH /pets/$PET_ID` updates only sent fields (other fields untouched)
- [ ] `DELETE /pets/$PET_ID` returns 204
- [ ] `GET /pets/$PET_ID` after delete → 404
- [ ] Cross-owner check: sign in as user B, `GET /pets/<userA's pet id>` → 403 Forbidden
- [ ] Validation: bad body (`weightKg: -1`, `name: ""`) → 400 with zod issues

### S3 upload (requires `AWS_S3_BUCKET_PETS` set + bucket exists with proper CORS)

- [ ] Bucket CORS allows `PUT` from your dev origins (`http://localhost:3000`, Expo dev URL):
  ```json
  [
    {
      "AllowedMethods": ["PUT"],
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:8081", "https://yourdomain.com"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
  ```
- [ ] Bucket policy / object ACL allows public read on the `pet-photo/*` prefix (or use CloudFront in front later)
- [ ] `POST /pets/photo-upload-url` returns `uploadUrl`, `publicUrl`, `fileKey`, `requiredHeaders`, `expiresAt`
  ```bash
  curl -X POST http://localhost:3001/pets/photo-upload-url \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"kind":"pet-photo","mimeType":"image/jpeg","sizeBytes":204800}'
  ```
- [ ] `PUT $uploadUrl` with the file body + the returned `requiredHeaders` succeeds (200/204)
  ```bash
  curl -X PUT "$UPLOAD_URL" \
    -H "Content-Type: image/jpeg" \
    -H "Content-Length: 204800" \
    --data-binary @/path/to/biscuit.jpg
  ```
- [ ] `GET $publicUrl` returns the same bytes
- [ ] `POST /pets` with `photoUrl: $publicUrl` persists; `GET /pets` shows the photo URL
- [ ] Without S3 env: `POST /pets/photo-upload-url` → 503 with "S3 not configured" (graceful)
- [ ] `kind: 'avatar'` rejected by `pets/photo-upload-url` controller (403) — wrong kind

## M2 · Pagination contract (cursor-based)

All list endpoints (`/bookings`, `/walkers`, `/messages`, `/walkers/:id/reviews`) return
`CursorPage<T> = { items: T[], nextCursor: string | null }`. Client paginates via
`useInfiniteQuery({ getNextPageParam: (last) => last.nextCursor ?? undefined })`.

- [ ] First-page response has `nextCursor` non-null when more rows exist
- [ ] Sending `?cursor=$nextCursor` returns the next slice with no overlap with previous
- [ ] Last page returns `nextCursor: null`
- [ ] Garbage cursor (`?cursor=xyz`) → 400 `Invalid cursor`
- [ ] Mobile `FlashList` `onEndReached` triggers next page; spinner in `ListFooterComponent` while loading

## M2 · Step 3 — Providers search

Seed creates 2 providers in NYC: Wendy (40.7128, -74.0060) — walking + sitting,
Gretchen (40.7306, -73.9352) — grooming + walking.

### Search

- [ ] `GET /providers?serviceType=walking&lat=40.72&lng=-74.00&radiusKm=20` returns Wendy + Gretchen, sorted by distance ASC
  ```bash
  curl "http://localhost:3001/providers?serviceType=walking&lat=40.72&lng=-74.00&radiusKm=20" \
    -H "Authorization: Bearer $ID_TOKEN"
  ```
- [ ] Each item has `distanceM` (rounded metres), `offerings: [{serviceType:'walking', hourlyRateCents}]`
- [ ] `serviceType=grooming` returns only Gretchen
- [ ] `serviceType=boarding` returns `{items:[], nextCursor:null}` (nobody offers it)
- [ ] `radiusKm=1` near Brooklyn (`lat=40.65&lng=-74.0`) → empty (out of range)
- [ ] `maxHourlyCents=2700` filters out Gretchen's `walking` (priced 3000)
- [ ] `?limit=1` → first item only, `nextCursor` non-null
- [ ] Following `?cursor=$nextCursor` returns next item with no overlap, then `nextCursor:null`
- [ ] Garbage `?cursor=xyz` → 400 `Invalid cursor`
- [ ] Missing `serviceType` / out-of-range `lat` → 400 with zod issues
- [ ] Without Bearer → 401

### Single provider

- [ ] `GET /providers/<wendyId>` returns her `ServiceProviderProfile`
- [ ] `GET /providers/<random-uuid>` → 404
- [ ] Without Bearer → 401

## M2 · Step 4 — Availability + Bookings

### Provider availability (PUT replaces all)

- [ ] `GET /users/me/availability` initially `[]`
- [ ] `PUT /users/me/availability` saves a weekly schedule (e.g. Mon-Fri 9-17 UTC):
  ```bash
  curl -X PUT http://localhost:3001/users/me/availability \
    -H "Authorization: Bearer $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"slots":[
      {"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"},
      {"dayOfWeek":2,"startTime":"09:00","endTime":"17:00"},
      {"dayOfWeek":3,"startTime":"09:00","endTime":"17:00"},
      {"dayOfWeek":4,"startTime":"09:00","endTime":"17:00"},
      {"dayOfWeek":5,"startTime":"09:00","endTime":"17:00"}
    ]}'
  ```
- [ ] PUT a smaller array → returned set matches (atomic replace, no leftovers)
- [ ] Bad time format (`"9:00"`, `"24:00"`, start ≥ end) → 400 with zod issues
- [ ] Without Bearer → 401

### Booking create — validation pipeline

Pre-req: provider Wendy has `walking @ 2500` and availability Mon-Fri 09:00-17:00 UTC. Owner Olivia has pet `Biscuit`.

- [ ] Happy path → 201, returns Booking with `priceCents = round(2500 * (60/60)) = 2500`
  ```bash
  curl -X POST http://localhost:3001/bookings \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"providerId":"<wendyId>","petId":"<biscuitId>","serviceType":"walking","scheduledAt":"2027-01-04T10:00:00Z","durationMin":60}'
  ```
- [ ] Pet that isn't yours → 403
- [ ] Provider has no `walking` offering → 422 `PROVIDER_NO_OFFERING`
- [ ] `scheduledAt` < now+5min → 422 `SCHEDULED_AT_TOO_SOON`
- [ ] Outside availability (Sunday or 22:00 UTC) → 422 `OUTSIDE_AVAILABILITY`
- [ ] Slot crosses UTC midnight (`23:30 + 90min`) → 422 `OUTSIDE_AVAILABILITY` (MVP limitation)
- [ ] Overlap with an existing non-cancelled booking → 409 `OVERLAPPING_BOOKING`
- [ ] After cancelling the conflicting booking → re-create succeeds

### List + get

- [ ] `GET /bookings` returns bookings where caller is owner OR provider
- [ ] `?status=pending&from=2027-01-01T00:00:00Z` filters work
- [ ] Cursor pagination — `?limit=1` then follow `nextCursor` until null
- [ ] `GET /bookings/:id` for not-yours → 403; non-existent → 404

### State machine (action endpoints)

- [ ] `POST /bookings/:id/confirm` as owner → 403 (provider only)
- [ ] `POST /bookings/:id/confirm` as provider on `pending` → 200, status `confirmed`
- [ ] `POST /bookings/:id/confirm` again → 409 `BAD_TRANSITION`
- [ ] `POST /bookings/:id/start` as provider on `confirmed` → 200, `in_progress`
- [ ] `POST /bookings/:id/end` as provider on `in_progress` → 200, `completed`
- [ ] `POST /bookings/:id/cancel` on `completed` → 409 `BAD_TRANSITION`

### Cancellation outcomes (no money moves yet — that's M4; we just record amounts)

- [ ] Owner cancels ≥ 2h before event → status `cancelled`, `refundCents = priceCents`, `appFeeCents = 0`, `providerFeeCents = 0`
- [ ] Owner cancels < 2h before event → `refundCents = 0`, `appFeeCents = round(priceCents * 0.15)`, `providerFeeCents = 0`
- [ ] Provider cancels (any time) → `refundCents = priceCents`, `appFeeCents = 0`, `providerFeeCents = round(priceCents * 0.15)`
- [ ] Cancelled row also has `cancelledBy`, `cancelledAt`, `cancellationReason` (if sent)

## M2 · Step 5 — Web pet pages

Web app at http://localhost:3000 after sign-in. React Query for caching, MinIO for photo upload.

- [ ] `/pets` (no pets yet) → empty-state card with "Add your first pet" CTA
- [ ] Click → `/pets/new`, fill form (name, species, breed, weight, age, notes), submit
- [ ] Add photo:
  - File picker accepts jpeg/png/webp/heic only (HEIC may not preview in browser)
  - On select: spinner "Uploading…", file PUTs to MinIO `petwalker-pets-dev` bucket
  - On success: thumbnail appears, can press "Remove"
- [ ] Submit → redirected to `/pets`, the new pet card shows up with photo
- [ ] In MinIO console (http://localhost:9001), see file at `pet-photo/<userId>/<uuid>.jpg`
- [ ] `GET <publicUrl>` directly serves the bytes (CORS allowed http://localhost:3000)
- [ ] Click pet card → `/pets/[id]`, edit name/notes, save → list reflects change
- [ ] Delete button + confirm → 204 → redirected to `/pets`, gone from list
- [ ] Sign out, sign in as a DIFFERENT email → no pets visible (owner-scoped)
- [ ] As user B, navigate directly to `/pets/<userA's pet id>` → 403 (server-side guard)
- [ ] Validation: empty name → server 400 with zod issues; weight=-1 → 400

## M2 · Step 6 — Web providers browse + booking

Pre-req: signed in as Olivia (or any owner) with at least one pet.
Seed creates Wendy (walking, sitting in NYC) and Gretchen (grooming, walking near Bryant Park).

### Search

- [ ] `/providers` shows search form. Click "Use NYC (seed)" → lat/lng populate
- [ ] Submit → URL becomes `?serviceType=walking&lat=...&lng=...&radiusKm=10` (search-state in URL)
- [ ] Wendy + Gretchen appear, sorted by distance ASC
- [ ] Switch to `serviceType=grooming` → only Gretchen
- [ ] `radiusKm=1` → empty state ("No providers in this radius")
- [ ] Set `maxHourly=$26` → Wendy walking ($25) appears, Gretchen walking ($30) hidden
- [ ] Browser geolocation: "Use device location" populates real lat/lng (or fails silently)
- [ ] Pagination: set seed with 20+ providers (manually) → `nextCursor` non-null → "Load more" appends, not replaces

### Provider profile

- [ ] Click Wendy's card → `/providers/<wendyId>` shows full bio, all offerings
- [ ] Each offering has `Book {service}` button → routes to `/providers/<wendyId>/book?service=walking`

### Booking

- [ ] No pets: shows "Add a pet first" CTA, no form
- [ ] With pets: pet picker, datetime, duration dropdown, notes
- [ ] Price preview updates live: `60min × $25/h = $25.00`
- [ ] Submit during availability slot (Mon–Fri 09:00–17:00 UTC) → redirects to `/bookings`
- [ ] Submit outside slot (Sunday or 22:00 UTC) → "Provider is not available at this time."
- [ ] Submit overlapping with existing booking → "That slot is already booked."
- [ ] Submit < 5 min from now → "Pick a time at least 5 minutes from now."
- [ ] Provider drops walking offering then back to form → "Provider doesn't offer this service."

---

## M5 · Push Notifications

Pre-req: `APP_ENV=dev` (default). Push dispatcher is `DevLogDispatcher` — all sends are
logged, not delivered to a real device. Token registration still writes to `push_tokens`.

### Token registration

- [ ] Sign in on mobile simulator or device.
- [ ] On first boot, the app requests push permission (physical device) or silently skips (simulator).
- [ ] `POST /push/tokens` is called with `expoToken` + `platform`.
  ```bash
  # Verify row landed in DB
  make db-shell
  SELECT expo_token, platform, revoked_at FROM push_tokens WHERE user_id = '<yourUserId>';
  ```
  Expected: one row, `revoked_at` NULL.
- [ ] Call again (hot reload) → still one row (idempotent upsert).
- [ ] `DELETE /push/tokens/<expoToken>` → `revoked_at` is now non-null.
  ```bash
  curl -X DELETE "http://localhost:3001/push/tokens/<token>" \
    -H "Authorization: Bearer $ID_TOKEN"
  ```
- [ ] Without Bearer → 401.

### Booking-status notifications (dev mode — check backend logs)

- [ ] Provider confirms booking → backend log: `[DEV PUSH] to=... title="Booking confirmed!"`
- [ ] Provider starts booking → log: `title="Walk started!"`
- [ ] Provider ends booking → log: `title="Walk complete!"`
- [ ] Owner cancels booking → log for provider: `title="Booking cancelled"`
- [ ] Provider cancels booking → log for owner: `title="Booking cancelled"`

### Chat message notification (dev mode)

- [ ] Owner sends a message → log for provider: `title="New message from New message"`
- [ ] Provider sends a message → log for owner: same pattern.

### Deep-link (physical device with notifications enabled)

- [ ] Put app in background, trigger a booking status change.
- [ ] Notification appears in device tray.
- [ ] Tap → app opens to `/(tabs)/bookings/<id>`.
