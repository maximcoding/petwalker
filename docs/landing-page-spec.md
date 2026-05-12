# `/` — landing page spec

**Surface:** `/` (replaces current redirect-to-`/sign-in`)
**Status:** Spec — not yet implemented
**Mode:** Coder Mode (Maxim implements his own design)
**Last updated:** 2026-05-12

---

## User context

A first-time visitor lands on petwalker.com from a search engine, a marketing ad, a referral link, or a shared URL. They've never used the product. They need to understand in 5 seconds: **what is this, who is it for, can I trust it, and what do I do next.** This page is the only public marketing surface. Once they convert (sign-in or get-started), they don't see it again.

The page serves two audiences with one surface:
- **Pet owners** — primary. They book services. They are 95% of visitors.
- **Pet walkers** — secondary. They join as service providers. A clear "Become a walker" CTA routes them to a separate apply flow so the owner-focused page doesn't compromise the walker pitch.

## Primary action

`Get started` — top-right header button AND inside the hero. Routes to `/sign-in` (which handles new-user vs returning-user split via social auth).
- Always enabled.
- Same visual treatment in both placements (brand-600 filled button).

## Secondary actions

- `Sign in` — top-right header, less prominent than Get started. Same route, semantically the same; visually de-emphasised so first-timers don't pick it accidentally.
- `Become a walker` — dedicated section CTA. Routes to `/walker/apply` (does not yet exist — design separately in M2a #16). For now this can be a stub link.
- `Get the mobile app` → App Store + Google Play badges. External links.

## Layout (top to bottom)

```
┌────────────────────────────────────────────────┐
│ ┃ HEADER  (sticky, h-16)                       │
│  petwalker          Sign in   Get started      │
├────────────────────────────────────────────────┤
│                                                │
│   HERO                                         │
│   "Pet care," + "a tap away." (2-color)        │
│   "Walking, sitting, grooming, vet visits..."  │
│   [Get started]   [Sign in]                    │
│                                                │
│   (phone showcase + 4 dog orbs as backdrop —   │
│    reuse the existing PhoneShowcase component) │
├────────────────────────────────────────────────┤
│                                                │
│   HOW IT WORKS                                 │
│   "Easily find and book trusted pros."         │
│                                                │
│   ┌──┐ Pick a service                          │
│   ┌──┐ Choose your walker                      │
│   ┌──┐ Follow along in the app                 │
│   ┌──┐ Rate and review                         │
├────────────────────────────────────────────────┤
│                                                │
│   BECOME A WALKER (audience pivot panel)       │
│   "Are you a pet pro? Earn doing what you love." │
│   [Apply to walk]                              │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│   GET THE MOBILE APP                           │
│   [App Store]   [Google Play]                  │
├────────────────────────────────────────────────┤
│ FOOTER                                         │
│   Privacy · Terms · Help · Accessibility       │
│   © 2026 PetWalker, Inc.                       │
│   ──────                                       │
│   Social row: FB · IG · X · TikTok             │
└────────────────────────────────────────────────┘
```

### Section specs

**Header (`<header className="sticky top-0 z-sticky">`):**
- Height: `h-16` (64px).
- Background: `bg-surface-base/90 backdrop-blur` so content scrolls under it.
- Left: petwalker logo (paw + wordmark) — same style as `/sign-in` aside logo, anchored at `px-6`.
- Right: `Sign in` (text link, `text-ink-secondary hover:text-ink-primary`) + `Get started` (filled `bg-brand-600` button).
- Mobile: same layout, just tighter padding.

**Hero:**
- Full-bleed gradient background (`bg-gradient-sunset`).
- Left half (or top stack on mobile): the 2-color hero text + descriptor + CTA pair (`Get started` primary, `Sign in` ghost).
- Right half (or hidden on mobile): the phone showcase + 4 photo orbs. **Reuse `<PhoneShowcase>` and the orb layout from `/sign-in`'s aside.** The components already exist, the brand pane treatment translates 1:1.
- Hero copy: locked sizes (`text-5xl` desktop, `text-4xl` mobile — pick one and lock if you want zero responsive jumps, but a marketing hero is OK with a small bump).
- 2-color: `<span class="text-ink-primary">Pet care,</span> <span class="text-brand-600">a tap away.</span>` — period is the break.

**How it works:**
- White surface (`bg-surface-base`).
- Centered max-width container (`max-w-4xl mx-auto`).
- Title + subtitle stacked top.
- Below: 4 steps in a 2×2 grid on mobile, 1×4 row on desktop. Each step = small icon orb + step title (`text-lg font-semibold`) + 2-line description.
- Icons: Lucide. Suggested: `PawPrint` (Pick a service), `UserCheck` (Choose your walker), `MapPin` or `Smartphone` (Follow along), `Heart` or `Star` (Rate and review).

**Become a walker:**
- Soft accent background (`bg-warm-50` or a coral-tinted gradient).
- Two-column on desktop, stacked on mobile.
- Left: hero copy explaining the offer to walkers ("Earn flexibly," "Be your own boss," "Set your own rates").
- Right: a single walker photo (placedog.net fallback until a real cutout exists at `/images/landing/walker-portrait.jpg`).
- CTA: `Apply to walk` button (`bg-mint-600` or another non-brand accent so it visually splits from the owner-focused CTAs).

**Get the mobile app:**
- Centered, white background.
- Same `<AppStoreBadge>` and `<GooglePlayBadge>` components used in `/sign-in`.
- Above the badges: small caption "Take petwalker anywhere."

**Footer:**
- Dark surface (`bg-warm-900` or `bg-ink-primary` — reverse of the hero so it bookends the page).
- White text.
- Two rows:
  - Row 1 (links + copyright, centered): `Privacy · Terms · Help · Accessibility · About · © 2026 PetWalker, Inc.`
  - Row 2 (social): Facebook · Instagram · X · TikTok icons, all white, `text-ink-inverse hover:text-brand-300`.
- Social URLs — stub to `https://facebook.com/petwalker`, etc. until real accounts exist. Mark with `// TODO: replace with real social URLs` in code.

## States

| State | Trigger | Treatment | Recovery |
|---|---|---|---|
| Default | All sections render with placeholder photo fallbacks (placedog.net) | Full layout, no skeletons needed (no async data on landing) | n/a |
| Loaded with real photos | When `/images/landing/*.jpg` files exist on disk | Same layout, real photos | n/a |
| Footer social broken | Social URL placeholder still in code (`facebook.com/petwalker` doesn't redirect to real account) | Icon visible but link 404s if clicked | Replace stub URLs before marketing campaigns go live |
| `prefers-reduced-motion` | OS reduce-motion enabled | Any decorative hover/scroll animations disabled | Static reading, no motion |

No loading, empty, or error states — the page is static content (no server-driven data).

## Interactions

- **Header buttons:** standard click → `router.push('/sign-in')`.
- **Hero CTAs:** same.
- **Walker apply CTA:** `router.push('/walker/apply')` — for now this route 404s; design later in M2a #16. Coordinate timing so the link doesn't 404 in production.
- **App badges:** `target="_blank" rel="noopener noreferrer"` to App Store / Play Store.
- **Footer links:** internal navigation (`/privacy`, `/terms`, etc.). Internal social-icon links open in new tab.
- **Sticky header:** stays visible while scrolling. Subtle shadow appears once scrollY > 8px (apply `lg:shadow-subtle scroll:shadow-subtle` via a small client component — or just always show shadow if the header overlays content).
- **Smooth scroll to sections:** optional anchor links from header (`#how-it-works`, `#walkers`) — skip for v1.

## Sign-in strip-down (the merge unwind)

Once `/` lands, strip these from `/sign-in`:

| What | Where currently | Action |
|---|---|---|
| Phone showcase + 4 orbs in aside | `(auth)/layout.tsx` left pane | **Keep** — auth screen still benefits from brand presence on desktop. |
| Dachshund mascot at seam | `(auth)/layout.tsx` | **Keep** — same reason. |
| 4 mobile corner photo orbs | `(auth)/layout.tsx` | **Remove** — they belong on the marketing page now, not the auth flow. Mobile auth becomes clean: gradient + logo + form. |
| "Pet care, a tap away." hero text + long descriptor | `(auth)/layout.tsx` left aside | **Remove from aside** — hero text lives on `/` now. Aside keeps just the logo + phone showcase + badges. |
| "Get the mobile app" badges | `(auth)/layout.tsx` aside (desktop) and mobile bottom strip | **Keep desktop, remove mobile.** Mobile auth becomes form-focused; the badges live on `/` for marketing. |
| Copyright `© 2026 PetWalker, Inc.` in footer | `(auth)/layout.tsx` footer | **Remove** — copyright lives in `/` footer. Auth footer stays minimal: Privacy · Terms · Help. |

After the strip-down, the auth screen's job is unambiguous: **get the user authenticated**. The brand pane on desktop keeps a soft "this is petwalker" signal (logo + phone showcase) but doesn't try to be the marketing surface.

## Tokens reused

Everything from `tailwind.config.ts` already covers what this page needs:
- Colors: `brand-600`, `coral-*`, `mint-*`, `warm-*`, `ink-*`, `surface-*`.
- Gradients: `bg-gradient-sunset`, `bg-gradient-meadow`, `bg-gradient-sky`.
- Type: Plus Jakarta Sans (already loaded via `next/font`).
- Components: `PhoneShowcase`, `AppStoreBadge`, `GooglePlayBadge`, `PawPrint` icon.

No new tokens needed for the landing.

## Photos

Real photos to source (drop into `web/public/images/landing/` to take over from placedog.net fallbacks):

| Filename | What | Notes |
|---|---|---|
| `walker-portrait.jpg` | A friendly-looking pet walker with a dog | Use in "Become a walker" section. Mid-portrait, smiling. |
| `hero-collage.jpg` | (optional) — only if you want a single hero photo instead of the phone showcase | Skip if reusing phone showcase. |

The 4 phone-showcase orbs already have fallback URLs in `phone-showcase.tsx` (dog-walker-grass, dog-pedicure, plus 2 placedog stand-ins). No new files needed for the hero.

## Accessibility

- All decorative photos use `alt=""` (announced as non-content by screen readers).
- Walker photo uses meaningful alt (`alt="A petwalker pro walking a golden retriever in a park."`).
- All buttons have visible focus rings (Tailwind default `focus-visible:ring`).
- Touch targets: all CTAs are `min-h-touch` (44px).
- Social icons: each has `aria-label` (`aria-label="petwalker on Facebook"`, etc.).
- Color contrast: hero text on gradient — verify `text-ink-primary` against the lightest part of `bg-gradient-sunset` passes AA. (Current `/sign-in` text passes, so it should — verify on the landing too.)
- `prefers-reduced-motion`: any scroll-driven animations (header shadow appearing on scroll, sticky CTA bar bouncing into view) must respect it. The static layout itself is reduce-motion-safe.

## Notes / open items

- **No fake stats.** Don't render a "Top petwalker cities" section with invented counts. When real numbers exist, design that section then.
- **No fake testimonials.** Same rule.
- **Sticky bottom CTA bar on mobile** — optional v2 enhancement. A persistent "Get started" button anchored to viewport bottom on small screens. Adds conversion friction-reducer. Out of scope for v1.
- **SEO** — the page should have proper `<title>` ("petwalker — pet care, a tap away") and `<meta name="description">` set via Next.js Metadata API. Sitemap entry too. Coordinate with whoever owns search later.
- **i18n** — copy goes through `useTranslation` like everything else. English-only during dev (per Maxim's standing rule), batch ru/es/zh/he at end.
- **Analytics events to instrument** (placeholder list, wire when an analytics layer exists):
  - `landing_view`
  - `landing_cta_clicked` (with property: `placement: header | hero | walker_apply | app_badge`)
  - `landing_section_in_view` (per major section, for scroll-depth)

## Honeycomb check

- **Useful** ✅ — answers "what is this product, what does it do, how do I get in."
- **Usable** ✅ — one primary CTA path (Get started → /sign-in). Walker pivot is secondary and visually demoted.
- **Findable** ✅ — this IS the discoverable surface. The header repeats CTAs so they're reachable at any scroll position.
- **Credible** ✅ — no fake testimonials, no fake numbers. The page makes claims it can back up.
- **Desirable** ✅ — reuses the warm, photo-rich, gradient direction already established for the product. Doesn't read as enterprise.
- **Accessible** ✅ — all interactive elements have focus states, touch targets, alt text, ARIA labels (see Accessibility section).
- **Valuable** ✅ — earns its place by being the only public surface that converts unauthenticated visitors. Without it, the redirect-to-`/sign-in` makes the product look like an internal tool.

## Implementation order

Recommended:

1. Replace `app/page.tsx` (currently just `redirect('/sign-in')`) with a full client/server hybrid page.
2. Build static sections top-to-bottom: header → hero → how-it-works → walker pivot → app badges → footer. Each section is its own React component under `web/src/components/landing/`.
3. Reuse `<PhoneShowcase>`, `<AppStoreBadge>`, `<GooglePlayBadge>` as-is.
4. Add walker photo fallback path; ship with placedog stand-in.
5. Wire up `next/metadata` for `<title>`, `<description>`, `og:` tags.
6. Strip down `/sign-in` per the table above. Verify auth screen is now form-focused only.
7. Run responsive QA from 320px → 1920px. The landing CAN scroll (unlike `/sign-in`), so this is much simpler — just verify sections stack, photos crop sensibly, header stays sticky.

## Out of scope

- Any 3D / Lottie / video hero treatments.
- A blog or news section.
- Pricing transparency table (no pricing model defined yet).
- City/coverage list (no real coverage data).
- Email-capture / newsletter signup.
- Cookie banner / GDPR consent UI — covered separately under privacy work.

## Owner

`web/src/app/page.tsx` (currently a one-line redirect — to be rewritten).
Landing-specific components go under `web/src/components/landing/`.
