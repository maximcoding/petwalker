# Auth screen — resize motion spec

**Surface:** `/sign-in` (and any future screen using `(auth)/layout.tsx`)
**Status:** Spec — not yet implemented
**Mode:** Coder Mode (Maxim implements his own design)
**Last updated:** 2026-05-12

---

## The problem

At the `lg` breakpoint (1024px) the layout doesn't morph, it **snaps**. Six things flip simultaneously:

1. Aside (left brand pane) un-hides
2. Dachshund mascot at the seam un-hides
3. Section (right form pane) gains `bg-surface-raised`
4. Four corner photo orbs un-hide (`lg:hidden`)
5. Form card frame appears (`lg:rounded-2xl lg:bg-surface-raised lg:p-8`)
6. Mini-header hides (`lg:hidden`)

A 1-pixel viewport change at 1024px swaps the entire screen identity. That hard break is the unpolished feeling we're fixing.

## What "parallax" means here

Not scroll-parallax. **Choreographed layered motion during viewport-width change**, where backplate elements move slowly and foreground elements move quickly, so the eye reads continuous transformation instead of a discrete jump.

## Design philosophy

- **Layers move at different speeds.** Anchor elements (gradient, mini-header logo position) don't move. Mid-layer elements (phone showcase, dachshund) move slowly with a delay. Foreground elements (form, orbs) move quickly.
- **Same easing, different timings.** All transitions use one motion curve. The parallax sensation comes from staggered `transition-delay`, not from mixing easings.
- **No display flips inside the choreography.** CSS can't transition `display`/`visibility`/`flex-direction`. Anywhere we currently use `hidden lg:block` for an element that should *transition* (not snap), swap to `opacity` + `transform` + `pointer-events`.
- **Acknowledge the flex-direction snap.** `flex-col` → `flex-row` at 1024px is unavoidable in pure CSS. Hide it by ensuring the form's bounding box is already at its target position when the flip happens (form is horizontally centered on mobile AND vertically centered on desktop in its half — design so the form's center-of-mass barely moves).

## Layer choreography

All durations and delays are token names (defined below). Default direction is **wide → narrow** (window shrinking from desktop to mobile). Reverse on widening.

| Layer | Element | Property on shrink ↓ | Duration | Delay | Easing |
|---|---|---|---|---|---|
| Anchor | gradient background | none | — | — | — |
| Anchor | logo wrapper (both mini-header + aside) | none — position is the same on both sides of the breakpoint | — | — | — |
| Mid-back | dachshund-at-seam | `opacity 1 → 0` and `scale 1 → 0.85` | `parallax-slow` | `parallax-3` | `parallax` |
| Mid | phone showcase | `opacity 1 → 0` and `scale 1 → 0.65` | `parallax-mid` | `parallax-2` | `parallax` |
| Mid | aside hero text ("Pet care, a tap away." + descriptor) | `opacity 1 → 0` | `parallax-fast` | `parallax-2` | `parallax` |
| Foreground | form card frame (`bg-surface-raised`, `shadow-overlay`, `rounded-2xl`) | `opacity 1 → 0` — the frame, not the contents | `parallax-fast` | `parallax-1` | `parallax` |
| Foreground | corner photo orbs (4×) | `opacity 0 → 1` and `scale 0.9 → 1` | `parallax-mid` | `parallax-3` | `parallax` |
| Foreground | mini-header (mobile logo strip) | `opacity 0 → 1` | `parallax-fast` | `parallax-3` | `parallax` |
| Foreground | mobile "Get the mobile app" + Privacy footer | `opacity 0 → 1` and `translateY 8px → 0` | `parallax-fast` | `parallax-3` | `parallax` |

On widening, mirror the timings — orbs disappear first (their `parallax-3` delay becomes the "leading edge"), dachshund settles last.

## Motion tokens

Add to `tailwind.config.ts` under `theme.extend`:

```ts
transitionDuration: {
  'parallax-fast': '180ms',
  'parallax-mid':  '240ms',
  'parallax-slow': '280ms',
},
transitionDelay: {
  'parallax-1':    '80ms',
  'parallax-2':    '180ms',
  'parallax-3':    '320ms',
},
transitionTimingFunction: {
  'parallax':      'cubic-bezier(0.4, 0, 0.2, 1)',
}
```

Token usage example:

```tsx
<div className="
  hidden lg:block
  transition-[opacity,transform] duration-parallax-slow delay-parallax-3 ease-parallax
">
  {/* dachshund */}
</div>
```

## CSS strategy — replacing `hidden lg:block`

The `hidden ↔ block` switch is the snap. Replace with always-rendered elements whose **opacity + transform + pointer-events** flip at the breakpoint. The element stays in the DOM at all times; CSS transitions handle the visual swap.

**Pattern for elements desktop-only:**

```tsx
{/* Before — snaps */}
<div className="hidden lg:block">…</div>

{/* After — transitions */}
<div className="
  opacity-0 scale-95 pointer-events-none
  lg:opacity-100 lg:scale-100 lg:pointer-events-auto
  transition-[opacity,transform] duration-parallax-mid ease-parallax
">…</div>
```

**Pattern for elements mobile-only:** mirror — `opacity-100 lg:opacity-0`.

**Edge:** absolute-positioned elements don't need `pointer-events`-aware swaps unless they sit over interactive content. The orbs are `pointer-events-none` already; the dachshund is too.

## The flex-direction snap — handling it

`flex-col` (mobile) → `flex-row` (desktop) flip at 1024px is the only thing CSS can't transition. Two coping moves:

1. **Make the form's box pre-positioned.** On both sides of the breakpoint, the form card's horizontal center should be at roughly the same screen X coordinate. Mobile: form is horizontally centered in viewport (already true). Desktop: form sits in the right pane (50–55% wide), centered in that pane — meaning the form's horizontal center is at ~75% of viewport. **At 1024px the form WILL jump from 50% to 75% horizontally.** This is unavoidable.

   Mitigation: at 1024px exactly, both layouts visually overlap for one frame because the choreographed orbs and aside are mid-fade. The user's eye is occupied. The form's X-jump becomes the lesser visual event.

2. **Vertical center matches.** On mobile the form is centered in the section's flex-1 area (vertically). On desktop, same — form is `items-center` in its half. Form Y position barely changes across the flip. That stability hides the X-jump.

If you ever want true continuous morph (no flex-direction switch), switch to `grid-template-columns` with `clamp()`. Out of scope for this spec — too invasive.

## `prefers-reduced-motion`

Every transition above must respect the OS-level reduce-motion preference. Without this, parallax flips into a vestibular accessibility issue.

Add to `tailwind.config.ts`:

```ts
// Already supported via Tailwind's built-in `motion-reduce:` variant.
// Apply on every transitioning element:
'motion-reduce:transition-none'
```

Example:

```tsx
<div className="
  transition-[opacity,transform]
  duration-parallax-slow delay-parallax-3 ease-parallax
  motion-reduce:transition-none motion-reduce:duration-0
">…</div>
```

With reduce-motion on, the visual swap is instantaneous (back to today's snap behavior). That's correct — users who opt out of motion have explicitly said they prefer the snap.

## Implementation order

Recommended sequence for the implementer:

1. Add the motion tokens to `tailwind.config.ts`. Verify class names compile.
2. Apply the transition pattern to the **dachshund-at-seam** first — it's the largest, most visible element. Sanity-check the easing feels right at desktop ↔ mobile resize.
3. Apply to the **phone showcase**. Confirm the `scale 0.65` shrink reads as "phone slides away" not "phone shrinks."
4. Apply to the **aside hero text** and **form card frame**.
5. Apply to the **4 corner orbs** and **mini-header** (mobile-only fade-in).
6. Apply to the **mobile bottom strips** (badges + footer).
7. Verify `prefers-reduced-motion: reduce` triggers instant swaps.

Skip step 1 by running Tailwind config build between (2) and (3); restart dev server if HMR doesn't pick up new tokens.

## QA checklist (resize from 1280px → 320px and back)

- [ ] No element snaps at exactly 1024px (other than the unavoidable flex-direction flip)
- [ ] Dachshund fades and shrinks, doesn't pop
- [ ] Phone showcase fades, doesn't disappear in 1 frame
- [ ] Corner orbs fade in *after* the desktop elements fade out (their `parallax-3` delay is later)
- [ ] Form card frame's white background fades (not snaps) on mobile
- [ ] Form's vertical center stays roughly stable across the breakpoint
- [ ] At reduce-motion, everything snaps instantly with no in-between frame
- [ ] No "flash of unstyled content" during HMR

## Out of scope

- Scroll-parallax effects on the page itself (no — the layout is `h-[100dvh] overflow-hidden`).
- Container-query-driven continuous morph (no flex-direction snap). Too invasive for the payoff.
- Page-to-page transitions (e.g. `/sign-in` → `/onboarding`). That's a Next.js App Router / `next/navigation` concern, separate spec.
- Loading skeletons for the form (covered in `auth-states.md` if/when that exists).

## Owner

`(auth)/layout.tsx` is the integration point. Phone showcase lives at `components/auth/phone-showcase.tsx`. Form card wrapper is inline inside the layout's section element.

Any future auth screens (`/confirm`, `/forgot-password`, `/walker/apply`) inherit this layout, so adding them shouldn't reopen the motion question — they'll get parallax for free.
