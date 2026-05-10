# Mock API pattern

The skill ships a strict rule: **every UI fetch must succeed against a mock so the demo is clickable end-to-end on `pnpm dev`**. Pick one of two patterns per phase and stick with it.

## Decision tree

| If the slice involves… | Pick |
|---|---|
| Plain REST-shaped requests (GET /providers, POST /bookings) | **Pattern A — Next route handlers** |
| Websocket / SSE / polling / fine-grained timing control | **Pattern B — MSW** |
| Auth flows that talk to AWS Cognito | Neither — Cognito has its own emulator. Use Amplify's local helpers or stub the auth response in the auth context. |

Don't mix patterns within a single milestone PR. If a future milestone needs the other pattern, plan a small migration step and call it out in the PR description.

---

## Pattern A — Next.js route handlers under `app/api/_mock/`

Best when the slice maps cleanly onto eventual real endpoints.

### File layout

```
web/src/
  app/
    api/
      _mock/
        providers/
          route.ts            ← GET (list with filters), POST (create)
          [id]/route.ts       ← GET, PATCH
        bookings/
          route.ts
          [id]/route.ts
          [id]/start/route.ts ← POST — provider Start action
          [id]/end/route.ts   ← POST — provider End action
        messages/
          route.ts
          [threadId]/route.ts
        ...
  lib/
    mock/
      providers.ts            ← in-memory fixtures + mutators
      bookings.ts
      messages.ts
      _seed.ts                ← initial seed loader
```

### Route handler shape

```ts
// web/src/app/api/_mock/providers/route.ts
import { NextRequest } from 'next/server';
import { listProviders } from '@/lib/mock/providers';

export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') {
    return new Response('Mocks disabled', { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const data = listProviders({
    serviceCategory: searchParams.get('service'),
    maxDistanceKm: Number(searchParams.get('maxKm')) || undefined,
    sort: searchParams.get('sort') || 'recommended',
  });
  // Slight artificial delay so skeletons get a chance to render
  await new Promise((r) => setTimeout(r, 250));
  return Response.json(data);
}
```

### Client side

Use `react-query` queries that call `/api/_mock/providers` when `NEXT_PUBLIC_USE_MOCKS === 'true'`, otherwise hit the real API URL. Centralize the URL choice in one helper:

```ts
// web/src/lib/api-base.ts
export const apiBase = () =>
  process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
    ? '/api/_mock'
    : process.env.NEXT_PUBLIC_API_URL!;
```

### When to flip mocks off

When the real `gagot-api` (or its replacement) supports a resource, the M-Backend-handshake milestone replaces `_mock/<resource>/route.ts` with nothing — the client falls back to `NEXT_PUBLIC_API_URL` per the helper above. One resource at a time.

---

## Pattern B — MSW (Mock Service Worker)

Best when the slice involves websockets, polling, or precise request interception (live tracking, typing indicators, photo stream during in-progress).

### Setup once

```bash
pnpm --filter @petwalker/web add -D msw
pnpm --filter @petwalker/web exec msw init public/ --save
```

### File layout

```
web/src/
  mocks/
    handlers.ts          ← all REST handlers
    websocket-handlers.ts ← WS/SSE fakes
    seed.ts              ← shared in-memory state
  app/
    providers.tsx        ← bootstraps MSW worker on Client root when mocks are on
```

### Bootstrap

```tsx
// web/src/app/providers.tsx (excerpt)
'use client';
import { useEffect, useState } from 'react';

function useMockWorker() {
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_USE_MOCKS !== 'true');
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') return;
    import('@/mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledRequest: 'bypass' }).then(() => setReady(true)),
    );
  }, []);
  return ready;
}
```

Render children only after `ready` so no real request slips through.

---

## Fixture conventions (both patterns)

- **Realistic data only.** No lorem ipsum, no "John Doe". Pull from `references/seed-vocabulary.md` if it exists, otherwise invent dog names, walker names, plausible service notes (e.g. "30-min walk through Highbury Park, brought treats"), realistic hourly rates by region.
- **Tone-aligned copy.** Energetic, playful, warm. A walker bio reads like a friendly intro, not a CV.
- **Time-shifted timestamps.** Anchor `now` at request time and offset fixtures relatively (e.g. "next booking is in 2h", "last review is 3 days ago"). Never hard-code dates that look stale a week later.
- **Cross-linked IDs.** Bookings reference real Provider and Pet IDs from the same seed; clicking through always lands on a populated screen.
- **Empty-state coverage.** Have at least one "empty" persona — a brand-new owner with no pets, no bookings, no favorites — for testing empty states without code-toggling.
- **Latency variability.** Inject 100–400ms latency randomly so skeletons render and pagination feels real. Slow path (>2s) for one in 20 requests so the brief's "Still loading — slow connection?" UI gets exercised.
- **Failure injection.** A `?_failRate=0.2` query param (gated by mocks) makes 20% of requests 5xx — useful for QA-ing error states without mutating the handler code.

## Resource shapes (canonical for the slice)

Place these as TypeScript interfaces in `@petwalker/shared` so both web and (eventually) mobile reuse them. If the type already exists there, extend it; don't fork.

- `Provider` — id, name, avatar, coverPhoto, intro video URL, rating, reviewCount, services[], baseAddress, coverageKm (or per-service map), languages[], responseTimeAvgMin, verified (bool), credentialed (per-category map), bio, experienceStartYear, photos[]
- `Booking` — id, ownerId, providerId, serviceCategory, status, mode (timeSlot | dateRange), scheduledAt or { checkIn, checkOut }, durationMin, pets[], location, notes, attachments[], totalCents, currency, paymentMethodId, lifecycleEvents[]
- `Pet` — id, ownerId, name, photo, species, breed, dob, weightKg, sex, neutered, color, microchipId, feeding, medications[], allergies[], behavior[], vetContact, emergencyContact
- `Address` — id, ownerId, label, line1, line2, city, region, postalCode, country, unit, gateCode, notes, isDefault
- `Message` — id, threadId, senderId, sentAt, body, attachments[], readAt
- `Notification` — id, userId, type, payload, createdAt, readAt, deepLink
- `Review` — id, bookingId, ownerId, providerId, stars, body, photos[], reply, createdAt
- `PaymentMethod` — id, userId, kind (card | applePay | googlePay | paypal), brand, last4, exp, isDefault
- `BookingLifecycleEvent` — bookingId, kind (requested | confirmed | cancelled | started | arrived | photoPosted | notePosted | ended | reviewed | tipPosted), at, actor (owner | provider | system), payload?

If you add a field to a shape, add it to the seed too — TypeScript should make this impossible to forget.
