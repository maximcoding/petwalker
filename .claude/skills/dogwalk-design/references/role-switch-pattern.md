# Role switch pattern (Owner ↔ Provider)

The brief: a single account toggles between Owner and Provider modes. Provider mode unlocks immediately after the user opts in; an account can run as Owner only, Provider only, or both at the same time.

The repo already has `web/src/contexts/view-mode-context.tsx`. Extend it; don't replace.

## Context contract

```ts
type ViewMode = 'owner' | 'provider';

interface ViewModeContextValue {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  isProviderEnabled: boolean;          // user has activated provider mode at least once
  enableProvider: () => Promise<void>; // calls become-a-provider mock + flips flag
}
```

- Default `mode`: `'owner'` for new accounts, last-used otherwise.
- Persistence: `localStorage` key `pw.viewMode` for the active mode; `pw.providerEnabled` boolean for whether provider mode has ever been activated.
- The provider remains in their own mode after refresh — no flicker. The provider on initial render reads from `localStorage` synchronously inside the Client provider so SSR/CSR don't disagree visibly.

## Toggle UI

The toggle lives in **AvatarMenu**:

```
[ Avatar ▼ ]
  ─────────────
  Active mode: [ Owner ▾ Provider ]   ← segmented control
  ─────────────
  Personal info
  Account & security
  Help
  Sign out
```

- Segmented control, not a radio list.
- Switching is instant: `setMode('provider')` updates context; the route stays the same if it's a shared route, otherwise the AvatarMenu also closes and the user lands on the role's home (`/` for owner, `/provider` for provider — or wherever M4 settles).
- If `isProviderEnabled === false`, the segmented control shows the "Provider" segment with a small "Become a provider" affordance instead of the toggle. Clicking it opens the provider onboarding wizard (M4).

## Route protection

Three categories of routes:

1. **Shared** — works in both modes. Reads `mode` from context to swap content/widgets. Examples: `/messages`, `/profile/*`, `/`.
2. **Owner-only** — the URL exists for owners. Examples: `/booking/[flow]`, `/pets/*`, `/favorites`. If a provider-mode user lands here, soft-switch to owner mode for the page (and surface a toast: "Switched to Owner to view this page") — **don't** redirect away unless the route is contextually impossible.
3. **Provider-only** — the URL exists for providers. Examples: `/provider/onboarding`, `/provider/schedule`, `/provider/earnings`. If an owner-mode user (or non-provider account) hits the URL, render a friendly upsell (`<BecomeProviderUpsell>`) with a CTA that opens the onboarding wizard. **Never 404** — the brief is explicit about empty/error states being friendly.

A small helper handles category 2 and 3:

```tsx
// web/src/components/role-gate.tsx
'use client';
import { useEffect } from 'react';
import { useViewMode } from '@/contexts/view-mode-context';
import { toast } from 'sonner';

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { mode, setMode } = useViewMode();
  useEffect(() => {
    if (mode === 'provider') {
      setMode('owner');
      toast.message('Switched to Owner to view this page');
    }
  }, [mode, setMode]);
  return <>{children}</>;
}

export function ProviderOnly({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { mode, isProviderEnabled } = useViewMode();
  if (!isProviderEnabled || mode !== 'provider') return <>{fallback}</>;
  return <>{children}</>;
}
```

## Reading the mode in components

```tsx
import { useViewMode } from '@/contexts/view-mode-context';

function BookingActions({ booking }: { booking: Booking }) {
  const { mode } = useViewMode();
  const actions = getActions(booking, mode); // see booking-lifecycle.md
  return <ActionFooter actions={actions} />;
}
```

- Server Components can't read context. If a Server Component needs the mode (e.g. to choose initial fetched data), it accepts `mode` as a search param and the Client wrapper at the route layer reads context and passes it. Keep these crossings minimal.

## App Shell wiring

The App Shell (M1) consumes `mode` to swap two surfaces:

- **Header (desktop)** — primary nav links differ. Owner: Search / Bookings / Pets / Messages. Provider: Schedule / Pipeline / Earnings / Messages.
- **BottomTabBar (mobile)** — same swap.

Use `useViewMode()` inside the App Shell. Don't render both navs and CSS-hide one — that ships dead nodes for screen readers.

## Test conventions

Every dual-mode screen ships a Playwright spec that runs against both modes:

```ts
import { test } from '@playwright/test';

for (const mode of ['owner', 'provider'] as const) {
  test(`messages thread list — ${mode}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((m) => localStorage.setItem('pw.viewMode', m), mode);
    await page.goto('/messages');
    // ... assertions specific to the mode
  });
}
```

For provider-only routes, set `pw.providerEnabled = "true"` in addition to `pw.viewMode`.

## Anti-patterns

- Reading the mode from the URL — not the source of truth.
- Hard-redirecting providers off owner-only routes (silent and confusing) — soft-switch + toast instead.
- 404ing on provider-only routes for non-providers — render the upsell.
- Forking components per role when 2 lines of conditional rendering would do.
- Persisting the mode to a server cookie — keeps SSR honest at the cost of double-source-of-truth bugs. Stay client-side until a real product reason emerges.
