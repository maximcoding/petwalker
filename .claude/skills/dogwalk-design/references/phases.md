# Phase map — milestones M1..M6

The brief at `docs/prompt_design.txt` is large (~280 lines, 50+ screens). Each milestone below is a separate feature branch and a separate PR. Confirm the milestone with Maxim before starting work.

Brief-line numbers below assume the canonical version of `docs/prompt_design.txt`. If the file has shifted, search for the section heading instead of trusting the range.

---

## M1 — Foundation

**Branch:** `feature/m1-foundation`

**Brief sections covered:**
- App Shell (lines 5–9)
- Tone & Visual Direction (280–283)
- Responsive Behavior (285–287)
- Loading & Skeletons (249–264)
- Error States — banner + 4xx/5xx full-page shells only; per-screen errors land with their screens (235–247)
- Empty States — base `<EmptyState>` component; per-screen content lands with screens (221–233)
- Common Patterns — Forms, Destructive actions, Toasts, Modals, Dates/times (266–278)

**Deliverables:**
- Token sweep on `globals.css` (energetic/playful/warm — bold colors, larger radii, generous spacing)
- Tailwind theme extends to consume the new tokens
- Layout primitives: `Container`, `Stack`, `Cluster`, `ResponsiveNav`, `Drawer`, `BottomTabBar`, `Header`, `Footer`
- App Shell wired in `(app)/layout.tsx`: pinned header (desktop) / bottom tabs (mobile), pinned footer, only body scrolls
- `<MapPlaceholder>` stub (typed props for future swap)
- `<EmptyState>`, `<OfflineBanner>`, `<ToastProvider>` wired to sonner
- PWA manifest in `public/` + favicon set + theme color
- i18n key namespace established in `en.json`
- Playwright responsive smoke spec scaffolded

---

## M2 — Auth + Account

**Branch:** `feature/m2-auth-account`

**Brief sections covered:**
- Auth (lines 12–26) — single screen + edge cases + first-time onboarding
- Personal Info, Addresses, Account & Security, Preferences (27–30)
- Notifications settings (31–36)
- Legal & Compliance auth-adjacent (cookie banner, age 18+) (210–215)

**Deliverables:**
- Single auth screen `/auth` with mode tabs (email+password / magic link / phone OTP / social) — extends existing `(auth)/sign-in` and `(auth)/sign-up`
- Edge-case screens (link expired, code wrong, email registered elsewhere, lockout)
- First-time onboarding (name, avatar, first pet — all skippable)
- Account & Security: password change, 2FA, active sessions
- Addresses CRUD with default flag
- Preferences: language, currency, units (already partially scaffolded under `profile/preferences`)
- Notifications settings: per-category mute, push/in-app toggle
- Cookie banner (EU regions)
- Age 18+ check on signup

---

## M3 — Owner core

**Branch:** `feature/m3-owner-core`

**Brief sections covered:**
- Home Screens — owner home (58–59)
- Owner Features — Search, Discovery, Provider Profile, Booking flow, Booking Lifecycle, Cancellation, Payment Methods, Billing, Booking Detail (62–131)

**Deliverables:**
- Owner home with hero search + sections (Upcoming / Recently booked / Favorites / Suggested / Browse by category)
- Search filters + sort + recent + saved
- Discovery — list + map toggle (uses `<MapPlaceholder>`)
- Provider profile (public view) — hero, about, services, availability widget (read-only month), reviews
- 5-step booking flow with progress bar (Time → Pet(s) → Location → Notes → Checkout)
- Checkout summary with Stripe Elements wrapper (sheet/modal owns wrapper, card form is Stripe-hosted)
- Booking detail (static) for all states
- Payment methods CRUD
- Billing history
- Mock booking lifecycle pure functions wired (see `booking-lifecycle.md`)

---

## M4 — Provider core

**Branch:** `feature/m4-provider-core`

**Brief sections covered:**
- Home Screens — provider home (60)
- Service Radius / Coverage Area (52–56)
- Provider Features — Onboarding, Credential Verification, Profile Setup, Schedule Builder, Booking Pipeline, Provider booking actions, Earnings, Payouts (146–194)

**Deliverables:**
- Become-a-provider toggle in AvatarMenu wired through `view-mode-context`
- Provider onboarding wizard (6 steps, resumable)
- Credential verification (gated for vet, optional badge for others)
- Profile setup tabs (Basics, Photos & video, Services & rates, Coverage, Schedule, Credentials, Payouts)
- Schedule Builder (Weekly hours, Time-off, Google Calendar connect button + status, existing bookings overlay)
- Booking Pipeline (Requests / Upcoming / Active / Past tabs)
- Provider action footers per state
- Earnings dashboard + per-booking breakdown + cancelled-on-you list
- Payouts setup (Stripe Connect status banner; onboarding is Stripe-hosted)
- Recharts added if charts are non-trivial

---

## M5 — In-progress + post-service

**Branch:** `feature/m5-in-progress-post-service`

**Brief sections covered:**
- Service categories — UX variations (45–50)
- In-progress views (132–135)
- Post-Service flow (136–142)
- Pets — extended fields (143)
- Recurring bookings (108)

**Deliverables:**
- Live Tracking view (live-tracked categories — walking, fitness, senior care): full-screen map placeholder, route polyline stub, elapsed timer, chat panel slide-up, photo stream rail, "Arrived" event
- Simple In-Progress view (single-location + multi-day): single check-in card, chat overlay, daily check-ins feed (multi-day)
- Photography deliverable: gallery on booking detail with download-all + per-photo download
- Post-service flow (provider summary read-only → mandatory rating → optional review → optional pet photos → tip)
- Tip calculator (10/15/20% presets, custom $1 to 50% of total)
- Recurring bookings: weekly/bi-weekly/monthly child generation; auto-skip on time-off
- Pet roster expanded fields (microchip, vet contact, emergency contact, etc.)

---

## M6 — Trust, support, polish

**Branch:** `feature/m6-trust-support-polish`

**Brief sections covered:**
- Messages (37–42)
- Notifications inbox (31–36 inbox side)
- Trust & Safety (196–202)
- Help & Support (204–208)
- Legal & Compliance (210–215) — GDPR, account deletion
- Empty/Error/Loading states across the app — final polish pass (221–264)

**Deliverables:**
- Messages — inbox + conversation view (bubbles, inline booking summary card, system messages, composer with attachments + retry, read receipts, typing dot, online dot)
- Notifications inbox with filter tabs and deep-linking
- Report user flow (categorized reasons + free-text + screenshots)
- Block user flow + Blocked users list under Account & Security
- Disputes flow from booking detail "Get help" → "Open a dispute"
- Help Center search + articles
- Contact Support in-app chat (pre-filled context)
- Status indicator (operational status banner)
- GDPR data export (zip) with rate limit
- Account deletion (two-step + soft-delete + anonymisation)
- i18n batch — at the end of M6, fill ru/es/zh/he from accumulated `en.json` keys

---

## Cross-cutting milestones (insert when needed)

These don't fit the linear M1..M6 sequence; spawn them on demand:

- **M-Maps** — pick Mapbox vs Google, replace `<MapPlaceholder>` with the real component everywhere it's used. Likely after M3 + M5 are clickable so the swap pays off immediately.
- **M-Realtime** — websockets/SSE for live tracking GPS broadcast, chat typing indicators, in-progress photo stream. Hooks in M5; backend support required.
- **M-i18n-batch** — fill ru/es/zh/he from accumulated `en.json` keys. Maxim's convention is to defer this to feature-end; M6 handles it for the catalog accumulated by then.
- **M-PWA** — install prompt, service worker, offline-first caching strategy, push notifications. Likely after M2 (so users can install) and before M5 (so live tracking can persist on a poor connection).
- **M-Backend-handshake** — flip `NEXT_PUBLIC_USE_MOCKS=false`, replace mock route handlers with real API calls one resource at a time. Coordinated with `resources/gagot-api`.

## Slice etiquette

If Maxim asks for "everything" or scope spans more than one milestone:

1. Name the milestones the request crosses.
2. Recommend starting with the foundation one (lower number first).
3. Get explicit confirmation on which one to ship in this PR.
4. The other milestones stay on the roadmap, not in this PR.
