# @petwalker/shared

Single shared TS module — used by `apps/web`, `apps/mobile`, and `apps/api`.

```ts
import {
  PetwalkerApi,
  BookingStatus,
  CreateBookingDto,
  Money,
  GeoPoint,
  Polyline,
  type Booking,
} from '@petwalker/shared';

const api = new PetwalkerApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  getToken: () => idToken,
});

const bookings = await api.bookings.list({ status: BookingStatus.Pending });
```

## Sub-paths

Tree-shakeable subpath exports if you only need one slice:

```ts
import { UserRole } from '@petwalker/shared/enums';
import { CreateBookingDto } from '@petwalker/shared/dto';
import { Polyline } from '@petwalker/shared/classes';
import { PetwalkerApi } from '@petwalker/shared/api';
```

## Layout

```
src/
├── enums/      UserRole, BookingStatus, PaymentStatus, PushPlatform, ChatEvent, TrackingEvent
├── types/      User, Pet, Booking, Walk, Message, Review, Payment, PushToken, common types
├── dto/        zod schemas + inferred TS types for every request/response
├── classes/    Money, GeoPoint, Polyline (domain helpers)
└── api/        HttpClient + per-resource API objects + PetwalkerApi facade
```

## Build

```bash
pnpm --filter @petwalker/shared build      # tsup → ESM + CJS + .d.ts
pnpm --filter @petwalker/shared typecheck
```
