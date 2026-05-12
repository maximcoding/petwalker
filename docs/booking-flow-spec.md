# Booking flow + Booking detail — spec

**Surfaces:** `/booking/new` (5-step wizard) and `/booking/[id]` (detail)
**Status:** Spec → implementation in same pass
**Mode:** Coder Mode (Maxim builds his own design)
**Last updated:** 2026-05-12

---

## User context

A pet owner is on a provider's profile page (or arrives from search). They've decided they want this provider. They tap **Book**, expect the booking to be done in under a minute, and don't want to fight a form. The flow has to feel fast on mobile (most bookings happen on phone in spare moments).

Walkers do not use this flow — they receive booking requests from owners.

## Primary action

**Book this walk** — final step's CTA. Only enabled when:
- Service, pet, date/time, and pickup location are filled
- ToS check is ticked

## Flow assumptions

- **Provider is pre-selected.** Entered via `/booking/new?providerId={id}` (from provider profile or search). If `providerId` is missing or invalid, the page redirects to `/search`.
- **Wizard is a single client component** with `useReducer` for cross-step state. No per-step routes (URL stays `/booking/new` throughout — back/forward buttons step the wizard, not the browser).
- **Payment is stubbed.** No card capture in this PR. The "Book" button mocks a successful charge and routes to `/booking/{id}`. Real Stripe/payment flow is M-Backend-handshake.
- **Mock data layer.** All reads (pets, provider services, availability) hit the existing `web/src/lib/mock/` fixtures. The booking create POSTs to a Next route handler that appends to the mock booking list in memory.

## Layout (top to bottom, same on every step)

```
┌──────────────────────────────────────────────┐
│ <Top>  ← Back to provider | Step 2 of 5      │
├──────────────────────────────────────────────┤
│ <ProgressBar>  ●●●○○                         │
├──────────────────────────────────────────────┤
│                                              │
│  <StepContent>                               │
│  Headline                                    │
│  Body — the step-specific picker             │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ <StepFooter sticky>  ← Back | Continue →     │
└──────────────────────────────────────────────┘
```

Sticky footer ensures the primary action is always thumb-reachable on mobile. Back button is left, Continue button is right.

## The five steps

### 1. Service

Pick which service this booking is for. Visible services = the intersection of (a) the categories the provider offers and (b) what `mock/providers.ts` declared for them.

Visual: 2-column grid of tiles (`ServiceTile`) — icon + label. Tap selects, single-select.

Default: if the provider offers only one service, auto-select and advance the wizard one step (skip the screen).

### 2. Pet

Pick which of the owner's pets this booking is for. Visible pets = `mock/pets.ts` for the current owner.

Visual: list of pet cards with photo + name + species + age. Single-select, large tap targets. "Add a pet" button at the bottom (out of scope this PR — link to `/pets/new` which 404s for now).

Default: if owner has one pet, auto-select and advance.

### 3. When & where

Two sub-sections on one screen:

**When** — date + time picker. Native `<input type="datetime-local">` for speed; we don't need a custom calendar in this PR. Minimum is "now + 1 hour" (mirrors the booking-lifecycle's start-window logic). Show provider's typical-response-time as a small note ("Sara usually confirms within 15 min").

**Where** — pickup mode radio:
- **At my home** (default) — uses the owner's stored address (read from `mock/users.ts` — stub field).
- **At their place** — uses the provider's address.
- **At a meeting point** — single-line text input, free-form. Future iteration adds a map picker.

### 4. Care notes

Free-form text area. Placeholder: "Anything the walker should know — feeding times, medication, leash quirks, gate code." Max 500 chars. Soft requirement (can skip).

Plus: a small "Add a photo" button (out of scope — stub).

### 5. Review & confirm

Read-only summary of the four prior steps with edit links that jump back to the relevant step. Below the summary:

- **Price breakdown** — base rate, duration adjustment, service fee, total. Numbers come from `provider.rates` × duration. (Use `mock` data, no real pricing engine.)
- **ToS check** — required checkbox: "I agree to PetWalker's [Terms](#) and [cancellation policy](#)." Continue button stays disabled until ticked.
- **Book this walk** — primary CTA.

On submit:
1. Show busy state on the button.
2. POST to `/api/bookings` (Next route handler appends to mock list).
3. `router.push('/booking/{newId}')`.

## State (TypeScript types)

```ts
type BookingDraft = {
  providerId: string;
  serviceId: string | null;
  petId: string | null;
  startsAt: string | null;     // ISO local datetime
  pickupMode: 'owner-home' | 'provider-home' | 'meeting-point';
  pickupAddress: string | null;  // free-text for meeting-point
  careNotes: string;
  termsAccepted: boolean;
};

type WizardState = {
  step: 1 | 2 | 3 | 4 | 5;
  draft: BookingDraft;
  busy: boolean;
  error: string | null;
};

type WizardAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: WizardState['step'] }
  | { type: 'set'; patch: Partial<BookingDraft> }
  | { type: 'submit-start' }
  | { type: 'submit-success' }
  | { type: 'submit-error'; message: string };
```

`canAdvance(state)` — pure validator per step. Continue button uses it to enable/disable.

## States per screen

| State | Trigger | Treatment | Recovery |
|---|---|---|---|
| Default | Step entered, no input yet | Step content visible, Continue disabled | Fill input → enabled |
| Filling | User typing/selecting | Real-time validation | n/a |
| Validated | All step-level required fields set | Continue enabled | Advance step |
| Invalid (per-step) | User tried to advance with missing field | Inline error under the field | Fix → enabled |
| Busy (step 5 only) | Submit in flight | Button shows spinner + "Booking…" | Wait; on error → invalid state |
| Error (step 5 only) | Mock POST failed (test by injecting) | Inline error banner above button | Tap Book again |
| Success | Mock POST resolved | Route to `/booking/{id}` | n/a (different screen) |

## Booking detail — `/booking/[id]`

Read-only after booking is created. Hydrates from `mock/bookings.ts` (looked up by id; redirect to `/bookings` if not found).

### Layout

```
<TopBar>  ← Back | Booking #ABC123 | menu •••
<Hero>
  Photo strip (provider + pet)
  Status pill (uses STATUS_HUE)
  Headline: "Walk with Sara"
  Subtitle: "Sat May 16 · 4:00 PM"
<Section>  Provider card
  Provider name + rating + "Message" + "View profile"
<Section>  Pet card
  Pet name + species + age + "Care notes" expand/collapse
<Section>  Where
  Pickup mode line + address
  (Map preview placeholder — uses <MapPlaceholder>)
<Section>  Price
  Base + adjustments + fee + total + paid status
<Timeline>
  State machine history with timestamps
<Actions>  Per-state action set from getActions()
  e.g. Cancel · Reschedule · Message · Mark as completed
```

### Action surfaces

Per the booking-lifecycle state machine, the action set varies by status:

| Status | Actions visible (from `getActions()`) |
|---|---|
| pending | Cancel · Message provider |
| confirmed | Reschedule · Cancel · Message provider |
| in-progress | View live map · Message provider |
| completed | Leave a review · Message provider · Book again |
| cancelled | Book again · Why was this cancelled? |
| in-dispute | Open dispute thread · Contact support |

Destructive actions (Cancel) confirm via a sheet/modal with the refund calculation from `refundForCancellation()`.

## Components to add

Under `web/src/components/m3/booking/`:

- `<WizardShell>` — sticky top + progress bar + sticky footer scaffolding. Children = current step.
- `<ProgressBar steps={5} current={n} />` — dot indicator.
- `<StepFooter onBack onNext canAdvance busy />` — sticky bottom CTA bar.
- `<ServicePicker providerId onPick />` — step 1.
- `<PetPicker onPick />` — step 2.
- `<WhenWherePicker draft onChange />` — step 3 (datetime + radio + text).
- `<CareNotesForm draft onChange />` — step 4.
- `<BookingReview draft providerData />` — step 5 (summary + price + ToS + book).
- `<BookingTimeline events />` — detail page state-machine history.
- `<ActionRow status bookingId />` — detail page action surface, reads from `getActions()`.

## Mock API

Add `/api/bookings/route.ts`:

- `GET` — return all bookings for the current "owner" (mock user).
- `POST` — append a new booking to the in-memory fixture, return `{ id }`.

Add `/api/bookings/[id]/route.ts`:

- `GET` — return the booking by id, or 404.
- `PATCH` — update status (used by Cancel / Reschedule / Mark complete actions).

These are intentionally thin — they just shuttle between the wizard and the in-memory mock store. Real backend swaps them out in M-Backend-handshake without touching the components.

## Interactions

- **Browser back at step N** (`N > 1`) → wizard moves to step `N-1`, browser URL stays at `/booking/new`. Implemented by intercepting `popstate` and pushing a synthetic state on each step entry.
- **Browser back at step 1** → leaves wizard, goes to `/providers/{id}` (provider profile).
- **Step navigation from progress bar** — only allowed for prior completed steps. Tapping a future step does nothing.
- **Edit links from review** → jump to specific step.
- **Confirm on submit** — no extra confirmation modal. The ToS check is the confirmation gate.
- **Detail-page Cancel** → opens a sheet with the refund calculation. User confirms → PATCH status → screen updates in place.

## Motion

- Step transitions: 200ms slide+fade (left-to-right on next, right-to-left on back). Honor `prefers-reduced-motion`.
- Progress bar fill: 240ms ease-out per step advance.
- Sticky footer: stays put, no entrance animation.
- Detail-page state changes: pill fades from old hue to new hue (300ms).

## Accessibility

- Step indicator has `aria-current="step"` on the active dot.
- Each step has an `<h1>` so screen readers announce the step on entry.
- Datetime input uses native picker (`type="datetime-local"`) — best a11y by default.
- Sticky footer buttons are real `<button>`s with focus-visible rings.
- ToS checkbox has visible label, not just `<label class="sr-only">`.
- Destructive action confirms have descriptive button text ("Cancel this booking", not just "Confirm").
- `prefers-reduced-motion` disables the slide transitions; steps cut instantly.

## Out of scope

- Custom calendar UI (native datetime-local is fine for v1).
- Map picker for meeting points (text input only).
- Photo upload on care notes (stub).
- Recurring bookings ("Every weekday").
- Group bookings (multiple pets per walk).
- Real payment capture.
- Push notifications for state changes.
- Booking dispute thread UI — link out to support email for now.
- Search/filter on the detail page (it's a single-record view).
- Owner-side bookings list page (`/bookings`) — separate spec.

## Implementation order

1. `WizardShell` + `ProgressBar` + `StepFooter` scaffolding.
2. State machine: `useReducer` with `WizardState` + `WizardAction` types, `canAdvance` helper.
3. Step components in order: `ServicePicker` → `PetPicker` → `WhenWherePicker` → `CareNotesForm` → `BookingReview`.
4. Route handlers under `/api/bookings/`.
5. `/booking/new/page.tsx` wiring (read `providerId` query, instantiate wizard).
6. `/booking/[id]/page.tsx` — booking detail with timeline + actions.
7. `BookingTimeline` + `ActionRow` + cancellation confirm sheet.
8. Smoke test by booking with each fixture provider.

## Honeycomb check

- **Useful** ✅ — closes the marketplace loop. Booking is the core transaction.
- **Usable** ✅ — 5 steps with auto-skip on single-option screens. Sticky footer keeps action reachable.
- **Findable** ✅ — entered from provider profile and search results, both already linking to `/booking/new?providerId=`.
- **Credible** ✅ — price breakdown is itemized. Cancellation refund is shown before confirming.
- **Desirable** ✅ — reuses M3 design tokens. Photo of pet + provider in the detail hero.
- **Accessible** ✅ — datetime native picker, step indicator with aria-current, ToS checkbox labeled.
- **Valuable** ✅ — without this surface the marketplace has nothing to transact.
