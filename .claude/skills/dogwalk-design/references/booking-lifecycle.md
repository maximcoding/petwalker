# Booking lifecycle state machine

The brief defines five primary states. Many screens render differently per state and per role, so the logic lives in one typed module: `web/src/lib/booking-lifecycle.ts`. Pure functions only — easy to unit test, no React, no fetch.

## States

| State | When | Pill color |
|---|---|---|
| `pending` | Owner submitted the request, provider hasn't responded yet. 24h timer running. | amber |
| `confirmed` | Provider tapped Confirm. Owner card charged at this moment. | blue |
| `inProgress` | Provider tapped Start (unlocked 15 min before scheduled time). | green |
| `completed` | Provider tapped End. | neutral |
| `cancelled` | Either side cancelled, or pending request expired. | red |
| `inDispute` | Either side opened a dispute from "Get help" after Completed. | purple |

`inDispute` is a sub-state of `completed` for the timeline — bookings can be both. Use a separate `disputeStatus` field instead of overloading `status`.

## Transitions (typed)

```ts
type BookingStatus = 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled';

type Transition =
  | { from: 'pending';     to: 'confirmed';   actor: 'provider' }
  | { from: 'pending';     to: 'cancelled';   actor: 'owner' | 'provider' | 'system' /* expiry */ }
  | { from: 'confirmed';   to: 'inProgress';  actor: 'provider'; gate: 'startWindowOpen' }
  | { from: 'confirmed';   to: 'cancelled';   actor: 'owner' | 'provider' }
  | { from: 'inProgress';  to: 'completed';   actor: 'provider' };

export function canTransition(b: Booking, t: Transition['to'], actor: Transition['actor']): boolean { /* ... */ }
```

The matrix is small enough that you don't need XState. A switch on `(from, to, actor)` is enough.

## Action footer per (state, role)

`getActions(booking, role)` returns the action footer for `BookingDetail`:

| State | Owner | Provider |
|---|---|---|
| `pending` | Cancel booking | (in Requests tab) Confirm, Decline |
| `confirmed` | Cancel booking, Get help, Edit notes, Open in-progress view (when In progress) | Cancel, Get directions, Start (when start window opens) |
| `inProgress` | Open in-progress view, Something's wrong | Open in-progress view, End |
| `completed` | Leave a review (if not yet), View invoice | (no action) |
| `cancelled` | Get help | Get help |
| `confirmed`+ | Get help, Report (always available) | Get help, Report |

`getActions` returns a typed array of `{ id, label, kind: 'primary' | 'secondary' | 'destructive', onClick }` so the BookingDetail component renders without conditionals.

## The 15-minute start window

The Start button on the provider side unlocks 15 minutes before the scheduled start time and stays enabled for the booking's duration. Pure helper:

```ts
export function isStartWindowOpen(now: Date, scheduledAt: Date, durationMin: number): boolean {
  const open = new Date(scheduledAt.getTime() - 15 * 60_000);
  const close = new Date(scheduledAt.getTime() + durationMin * 60_000);
  return now >= open && now <= close;
}
```

UI re-evaluates every 30s — a simple `useEffect` interval inside the action footer.

## Cancellation refund math

Per the brief:

- Owner cancels ≥ 2h before start → full refund, no platform fee.
- Owner cancels < 2h before start → no refund.
- Provider cancels (any time) → full refund to owner; provider charged a no-show fee.

```ts
type RefundOutcome = {
  refundCents: number;     // to owner
  platformFeeChargedCents: number;
  providerNoShowFeeCents: number;
};

export function refundForCancellation(
  booking: Booking,
  cancelledBy: 'owner' | 'provider',
  now: Date,
  policy: { providerNoShowFeeCents: number; platformFeeCents: number },
): RefundOutcome { /* ... */ }
```

The Destructive-actions confirmation dialog reads from this function ("You'll receive a refund of $24.50") — no string concatenation in JSX.

## Auto-expiry of pending requests

A `pending` booking auto-cancels 24h after creation if the provider doesn't respond. Mock implementation: a small `setInterval` in the mock layer (`lib/mock/_tick.ts`) that sweeps pending bookings each minute. Real implementation: backend cron. The lifecycle module exposes:

```ts
export function isPendingExpired(b: Booking, now: Date): boolean {
  return b.status === 'pending' && now.getTime() - b.createdAt.getTime() >= 24 * 60 * 60_000;
}
```

## Recurring booking child generation

Owner can mark a confirmed booking as Repeat weekly / bi-weekly / monthly. Each child is independently cancellable and is auto-skipped if it lands inside the provider's time-off, public holidays, or external calendar busy window.

```ts
type Recurrence = { kind: 'weekly' | 'biWeekly' | 'monthly'; until?: Date };

export function generateChildren(
  parent: Booking,
  rec: Recurrence,
  blocked: { start: Date; end: Date }[],
  now: Date,
): Booking[] { /* ... emits children with skipped: true where blocked overlaps */ }
```

Children carry `parentBookingId` so the BookingDetail screen can show "part of a recurring series".

## In-progress sub-events

Within `inProgress`, a stream of events from the provider:

- `arrived` — "I'm here" ping, surfaces as a check on the owner's live map and a chat entry.
- `photoPosted` — uploads stream into the timeline.
- `notePosted` — text note.
- `routePoint` — GPS sample (live-tracked categories only). Stored as a polyline server-side; client subscribes via WS in M-Realtime.

Each event has a typed schema and is logged to `Booking.lifecycleEvents[]`. The Live Tracking view consumes the array directly — no separate state.

## Dispute outcomes (M6)

If the dispute opens, `disputeStatus` enters `'open'`. Resolution outcomes (recorded by support):

- `'fullRefund'`
- `'partialRefund'` (with `refundCents`)
- `'noRefund'`
- Each may carry `providerPenaltyCents` (zero or positive).

The booking's `status` stays `completed` throughout; the `disputeStatus` drives the orange "In dispute" pill and pauses any payout to the provider until resolution.

## Tests

Unit-test the four pure functions:

- `canTransition`
- `getActions`
- `isStartWindowOpen`
- `refundForCancellation`
- `isPendingExpired`
- `generateChildren`

A Vitest spec next to the module is enough — no need for a separate test runner. If Vitest isn't set up yet, M3 is the right time to add it (it's the first milestone where lifecycle tests have something to bite).
