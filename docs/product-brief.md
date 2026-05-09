# Product design brief

> The original design brief that drove the IA, screens, and visual direction. Pre-implementation artifact — what we *set out* to build. The current implementation has diverged in places (e.g. iCal feeds replaced with Google Calendar OAuth-only — see [`google-calendar-setup.md`](./google-calendar-setup.md)). Read this for product intent and tone, not for current truth.
>
> Current architecture: [`architecture.md`](./architecture.md). Roadmap: [`roadmap.md`](./roadmap.md).

---

## Strategic addendum — anti-Rover positioning (2026-05-09)

After a competitive review against Rover / Wag / Care.com, the product direction tilts hard toward **"the pro-tool a working pet-services pro can run their whole business on"** rather than just another booking marketplace. The original brief is still the source of truth for screens and tone; what changed is the differentiation strategy. Concrete moves are sequenced in [`roadmap.md`](./roadmap.md) M7 + M8.

**What we're leaning into**

- **Provider stickiness through tools, not lock-in.** Off-platform clients in the same calendar, one-click tax export, voice-to-data walk reports, optional intro video. The platform becomes the easiest place to manage *all* a sitter's work — including the work that didn't come from us.
- **AI as augmentation, not gimmick.** Voice → structured walk report (Whisper + GPT-4o-mini) is concretely better UX. Vision-based photo sanity-check runs as a soft warning, not a blocker. Both go through BullMQ so users never wait on a model in the request path.
- **Trust signals beyond stars.** A safety score derived from existing data (GPS deviation, chat responsiveness, photo cadence) sits *next to* star ratings. Optional per-booking insurance via a 3rd-party partner. Verified Check-in as an opt-in badge.
- **Marketplace mechanics stay intact.** Bookings flow through Stripe, contact info stays masked, the platform is where transactions complete. Stickiness comes from features the user *wants*, not from a wall they can't get over.

**What we explicitly rejected**

- **Direct contact unlock after first booking.** Surfaces in some startup pitches as a way to "remove the leak problem" — actually destroys the marketplace flywheel by killing repeat-booking commission.
- **Importing reviews from competitors via scraping.** Rover / Wag ToS forbid it; copyright + PII land mines. Replaced with a transparent "X yrs experience on other platforms (self-reported)" field.
- **Mandatory AI dog-face check-in before each walk.** Friction-heavy, dog re-identification accuracy is ~70%, false negatives block real walks. Kept as opt-in only.
- **AI-driven demand prediction.** Hand-wavy without volume. Revisit when there's >1000 bookings/week of real demand data.

**Pending business decision**

- **Platform fee.** Brief and current implementation say 15%. Competitive analysis suggests 10–12% would be a meaningful UTP without breaking unit economics; 7–8% is aggressive and unproven. Decision deferred until cost-of-acquisition data exists. The fee constant lives in `bookings/cancellation-policy.ts` + `payments.service.ts` — change is mechanical once the number is picked.

Design a two-sided pet services marketplace called Dogwalk. This is a web and mobile app that connects pet owners with professional pet service providers — dog walkers, groomers, trainers, vets, and more. Think of it as the Airbnb for pet care: owners search, book, and pay; providers publish their schedule, accept bookings, and get paid. The app must feel energetic, playful, and warm — like it was built by people who genuinely love animals. Use bold colors, friendly rounded shapes, expressive iconography, and a personality that owners and providers will enjoy using every day.

The app supports three user roles. An Owner registers their pets and books services. A Provider sets up their profile, publishes availability, and delivers services. A user can be both simultaneously and switch between perspectives at any point in the app.

---

## Brand Personality

Energetic, playful, and trustworthy. The tone is casual and warm — like a knowledgeable friend who loves dogs as much as you do. Colors should feel lively but not chaotic. Think sunset oranges, sky blues, leafy greens, and sandy tans — all with high contrast and clear hierarchy. Illustrations and micro-animations should feel joyful. Icons should be friendly, slightly rounded, never corporate. Every empty state should delight, not disappoint.

Typography should be expressive in headers and comfortable in body text. Rounded sans-serif fonts work well. Spacing should be generous — this is a mobile-first app used outdoors, often while holding a dog leash.

---

## Platform

Design for both web (desktop and tablet) and mobile (iOS and Android via Expo). The experience should feel native on mobile and polished on web. Mobile is the primary use case — owners check booking status during walks, providers start and end sessions from their phone. The web version is used more for profile setup, searching, and payments.

All text and UI must support right-to-left layout for Hebrew. The app is available in English, Russian, Spanish, Chinese, and Hebrew.

---

## Core Navigation

There are two navigation contexts that share the same shell: the owner perspective and the provider perspective. A user can switch between them from the main menu.

From the owner side, the primary navigation sections are: Find Providers, My Pets, My Bookings, Favorites, Messages, and Profile.

From the provider side, the primary navigation sections are: My Bookings, My Schedule, Earnings, and Profile (Provider Setup).

The top navigation bar holds the app logo, a notification bell with an unread badge, and a user avatar/menu that shows the current user's name, role toggle (Owner / Provider / Both), language switcher, and sign-out option. On mobile, primary navigation lives in a bottom tab bar.

---

## Authentication Screens

Design three auth screens: Sign In, Sign Up, and Confirm Account.

Sign In takes email and password. It should have a forgot-password link and a call-to-action to create an account. Keep it clean — a hero illustration of a happy dog and owner above the form sets the tone.

Sign Up takes full name, email, password, and optionally phone number. Add a friendly tagline that speaks to why someone would join — something like "Your pets deserve the best care."

Confirm Account is shown after sign-up. The user receives a verification code by email and enters it here. Show a playful animation (envelope, confetti, paw print) while they wait.

---

## Owner Screens

### Find Providers (Search & Browse)

This is the most important screen for owners. It has a search form at the top with the following filters: service type (11 categories shown as icon chips — walking, grooming, sitting, boarding, training, daycare, photography and art, massage and wellness, senior care, veterinary, fitness), location (auto-detect or text input), date and time (optional, for pre-filtering), and price range (max hourly rate slider).

Below the form, results appear as scrollable cards. Each provider card shows their photo, full name, average star rating with review count, services offered (shown as small pill chips), distance from the user, years of experience, and a verified badge if applicable. Cards should feel lively — the photo is prominent, the verified badge is a trust signal shown clearly.

At the top of results, show recent search chips — quick-access pills showing the user's previous searches so they can re-run them in one tap.

When no providers match the filters, show a friendly empty state with an illustration and a suggestion to broaden the search.

### Provider Detail Page

A full-screen view of a provider's public profile. At the top, a large photo or avatar with their name, rating, review count, verified badge, experience badge ("Walking since 2019"), and a heart (favorite) button. Below that, their bio — up to 600 characters of personal description.

A section for their services — each service listed with its type icon, name, hourly rate, and booking mode (appointment-based or open availability). Tapping a service leads into the booking flow.

A section for availability — a visual weekly calendar showing which days and hours the provider is generally available.

A section for reviews — paginated list of reviews from past owners. Each review shows the reviewer's name, star rating, date, and comment text.

A sticky "Book Now" button at the bottom leads into the booking flow.

### Booking Flow

A multi-step flow initiated from a provider's service selection. Design this as a modal or a dedicated page — it should feel guided and reassuring, because the user is about to pay.

Step 1 — Date and time selection. Show a calendar. The user picks a date, then sees available time slots or picks a time window depending on the service type. Slot-mode services show discrete appointment buttons (e.g., "9:00 AM", "10:00 AM"). Window-mode services show a time range picker. Add shortcut buttons: Today, Tomorrow, Next Week, +1 month, +3 months.

Step 2 — Pet selection. Show the user's registered pets as selectable cards with photo, name, breed, and weight. If they have no pets yet, show an inline prompt to add one.

Step 3 — Service location. The user picks where the service takes place: at the pet's home, at the provider's location, or a custom address. Show only the options that the provider supports for that service type.

Step 4 — Notes. An optional text field for special instructions (allergies, gate codes, behavioral notes, etc.).

Step 5 — Payment. Show a price summary (service type, duration, rate, total) and a Stripe card input form. Display a clear breakdown including the total charged. After confirming payment, show a success state with a celebratory animation and a "View Booking" button.

### My Pets

A grid or list of the owner's registered pets. Each pet card shows their photo, name, species, breed, and age. A prominent "Add Pet" button anchors the page. Tapping a pet opens its detail/edit page.

The Add Pet / Edit Pet form collects: name, species (dog, cat, etc. with icons), breed, weight in kg or lb depending on unit preference, age in years, a photo (upload via camera or gallery), notes, and optionally an address override if the pet lives somewhere other than the owner's home.

Empty state: a playful illustration of a paw print or cartoon pet with the message "Your pets will show up here."

### My Bookings (Owner View)

A list of the owner's bookings, separated into tabs: Upcoming, Active, and Past. Each booking item shows the provider's name and photo, service type icon, date and time, status badge (pending, confirmed, in progress, completed, cancelled), and total price.

Tapping a booking opens its detail page.

### Booking Detail (Owner View)

Shows full booking info: service type, date and time, duration, provider, pet, address, total price, and current status. Below that, context-appropriate action buttons. If the booking is in progress, show a "Track Live" button prominently. If the booking is completed and unreviewed, show a "Leave a Review" call-to-action. If cancellable, show a "Cancel Booking" option with a refund breakdown preview.

### Active Walk / Live Tracking Screen

This is the most emotionally resonant screen in the app for owners. It shows a full-screen map with the provider's live location as an animated marker (a paw print or dog icon moving along the route). The walk trail is drawn as a colorful polyline on the map as the walk progresses.

A bottom sheet or overlay shows: the provider's name and photo, elapsed time, estimated walk duration, and a chat panel where the owner can send messages to the provider in real-time. This screen should feel alive and reassuring — the parent can see exactly where their dog is.

### Favorites

A grid of saved providers the owner has hearted. Each card is consistent with the search result card design. A "Remove from favorites" option is accessible via swipe or long-press on mobile.

Empty state: "You haven't saved any providers yet. Heart a provider to save them here."

### Messages (Inbox)

A list of active booking conversations. Each thread shows the other party's photo and name, the last message preview, and the timestamp. Tapping opens the chat for that booking. This is a simple messaging inbox — not a general social chat, only booking-related threads.

---

## Provider Screens

### Provider Profile Setup

Accessible from the profile section when the user has the Provider role. This is a multi-section form where the provider configures their public profile.

Section: Basic Info — bio text (600 chars max), city badge, base address (used for proximity search and as the default service location), and experience start year.

Section: Service Offerings — a list of services the provider offers. Each service can be added, edited, or removed. Adding a service opens a sub-form: select service type (from 11 categories with icons), set hourly rate, choose booking mode (appointment slots or open availability window), set default slot duration (for slot-mode services), configure the service address (use base address or a custom address for this service), and choose which location sources are supported for this service (at owner's home, at provider's location, at a custom address, any combination).

Services can be toggled active or inactive without deleting them — for seasonal availability.

Section: Availability — a weekly schedule builder. For each day of the week, the provider can add one or more time windows (e.g., Monday 9:00–12:00 and 14:00–18:00). Days with no windows are shown as "Unavailable." Changes to the template automatically regenerate future appointment slots.

Section: Time Off / Blackouts — a list of date ranges where the provider is unavailable. Each blackout has a start date, end date, and optional reason. When a recurring booking series overlaps a blackout, those instances are skipped automatically.

Section: Calendar Integration — connect Google Calendar via OAuth. The provider taps a button, goes through Google's auth flow, and their busy times are synced automatically every 30 minutes. Synced busy times are shown as blocked windows in the availability view. Show last sync timestamp and a manual sync button.

> **Diverged from original brief.** The original brief proposed two integration paths — OAuth Google Calendar AND pasted iCal feed URLs (Outlook, Apple, etc.). Implementation went OAuth-only because pasted iCal URLs leak full event titles and were a poor UX. See [`google-calendar-setup.md`](./google-calendar-setup.md).

### My Bookings (Provider View)

Same structure as the owner view but from the provider's perspective. Tabs: Requests (pending, awaiting their action), Upcoming, Active, Past. Each booking shows the owner's name and photo, service type, pet name and breed, date/time, and status badge.

### Booking Detail (Provider View)

Shows owner info, pet info, service, date/time, address, price, and status. Action buttons adapt to booking state: "Confirm" for pending bookings, "Start Service" for confirmed bookings, "End Service" for in-progress bookings, "Cancel" when applicable. Starting a service initiates GPS tracking. Ending it finalizes the walk trail and distance.

### Earnings Dashboard

A summary of the provider's financial performance. Shows total earnings this month, this year, and all-time. A list of recent payouts. Platform fee information (15% applied to each booking). A "Set Up Payouts" button that initiates Stripe Connect onboarding if not yet configured.

---

## Profile and Settings Screens

### Personal Info

Editable fields: full name, email (read-only, change via support), phone number, avatar photo, and bio. A save button commits changes. Avatar can be uploaded from camera or gallery.

### Security

Password change form (current password + new password + confirm). Placeholder sections for two-factor authentication and active sessions / device management — design them as "Coming Soon" cards with descriptive copy.

### Preferences

Language selector — 5 language options shown as flag + language name pills. Unit system toggle — Metric (km, kg) or Imperial (mi, lb). Preferred currency selector — USD, EUR, ILS shown as a segmented control or pill group.

### Finances

Two placeholder sections shown as preview cards: Payment Methods (add, edit, or remove saved cards) and Billing History (downloadable invoices for past bookings). Both are labeled "Coming Soon" with descriptive copy about what will be available.

---

## Notifications

A notification bell in the top navigation bar shows an unread count badge. Tapping it opens a dropdown or a dedicated screen showing a list of recent notifications. Each notification shows a small icon indicating its type (booking confirmed, walk started, walk ended, new message, payment processed), a short description, and a timestamp. A "Mark all as read" action clears the badge.

Notifications are delivered via push (mobile) and in-app (web). The app requests push notification permission during onboarding.

Empty state: "You're all caught up. Notifications about your bookings and messages will appear here."

---

## Reviews

After a booking is completed, the owner sees a prompt to leave a review for the provider. The review form shows the provider's name and photo, a 1–5 star picker (required), and an optional text field. Submitting shows a thank-you screen.

Reviews appear on the provider's public profile in a paginated list. Each review shows the reviewer's first name, star rating shown as filled stars, relative date, and comment text.

---

## Recurring Bookings

Accessible from the booking flow or bookings section. The owner can set up a recurring series: choose days of the week, time, service, pet, address, and a date range for the series. The system automatically generates individual booking instances, skipping dates that fall within the provider's blackout periods. The owner can cancel the entire series or individual instances.

Design a clear recurring booking indicator — a small loop or repeat icon on booking cards that are part of a series.

---

## Key States and Edge Cases to Design

Every list screen needs an empty state with an illustration and a helpful prompt. Design loading skeletons for provider cards, booking lists, and the live map. Design error states for failed payments, no availability, and expired sessions.

For the booking flow, design validation states: what happens when no pets are registered, when the selected time is no longer available, when the payment fails, when the provider's address doesn't support the selected location type.

For the live tracking screen, design a fallback state if GPS data is unavailable or the provider hasn't started the walk yet.

For the chat, design message bubbles for sent, received, and sending states. Include a timestamp and a read receipt concept.

---

## Component Inventory

Design a consistent component library that covers:

Cards — provider card (compact), provider card (expanded/detail), pet card, booking card (upcoming, active, past), notification item, review item, favorite card.

Inputs — text field, email field, password field, phone field, textarea, date picker, time picker, time range picker, slot grid picker, star rating picker, address field, image uploader, search bar with recent chips.

Buttons — primary (filled), secondary (outlined), destructive (red), ghost (text only), icon button, floating action button, segmented control.

Navigation — top navigation bar, bottom tab bar (mobile), breadcrumb (web), back button.

Overlays — modal dialog (confirmation), bottom sheet (mobile), tooltip, toast notification (success, error, info), loading spinner, skeleton loader.

Badges — status badge (pending, confirmed, in progress, completed, cancelled), verified badge, unread count badge, service type icon chip, role indicator.

Maps — full-screen map, walk trail polyline, live provider marker, static location pin.

Forms — multi-step booking form with step indicator, profile setup form with sections, settings form with grouped rows.

---

## Responsive Layout Notes

On mobile, use full-width cards, large tap targets (minimum 44px), thumb-friendly bottom navigation, and swipe gestures for common actions (swipe to favorite, swipe to cancel). Forms should be single-column. The map should be full-screen with overlaid controls.

On tablet and web, use a two-column layout for search results (filters on the left, results on the right). Provider detail pages can show the map and info side by side. Booking flows become centered modals with max width. The profile and settings section uses a sidebar navigation pattern.

On web, the top navigation bar is always visible. On mobile, it collapses into the header of the current screen and the bottom tab bar handles primary navigation.

---

## Accessibility and Usability Notes

All interactive elements must have clear focus states. Color alone should never convey meaning — pair colors with icons or labels. Text must meet WCAG AA contrast requirements. The app is used outdoors, often in bright sunlight, so high contrast is especially important on key screens like the active walk tracker. Touch targets on mobile should be large and forgiving. Support system dark mode with an appropriately adapted palette.

---

## Summary of Screens to Design

Authentication: Sign In, Sign Up, Confirm Account.

Owner flows: Find Providers (search + results), Provider Detail, Booking Flow (5 steps), Active Walk / Live Tracking, My Pets (list + add/edit), My Bookings (list + detail), Favorites, Messages (inbox + chat).

Provider flows: Provider Profile Setup (multi-section), My Bookings (list + detail), Booking Detail with service actions, Earnings Dashboard.

Shared profile: Personal Info, Security, Preferences, Finances.

System screens: Notification Center, Review Form, Recurring Booking Setup, Onboarding (first-time user flow for both roles).

Component library: all cards, inputs, buttons, navigation, overlays, badges, and map elements listed above.

Total screens: approximately 30–40 unique layouts, with states (empty, loading, error, success) designed for each. Mobile-first, responsive to tablet and desktop web.
