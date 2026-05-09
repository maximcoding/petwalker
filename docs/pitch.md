# Dogwalk — in 5000 characters

## What it is

Dogwalk is a two-sided marketplace for pet care — the Airbnb for everything you'd hire someone else to do for your
animal. Owners search nearby providers, book a time slot, pay through the app, and watch the booking play out in real
time. Providers run their entire small business from the same app: profile, schedule, bookings, earnings.

The marketplace covers eleven service categories under one roof: dog walking, sitting, grooming, boarding, training,
daycare, fitness, veterinary visits, photography, massage and wellness, and senior pet care. A single user account can
act as both an owner and a provider, switching modes from the avatar menu — so a part-time dog walker who also has cats
at home doesn't need two accounts.

## Owner experience

The owner journey starts at "find a provider." Filter by service type, location, distance, max hourly rate, and a
specific time slot if there's one in mind. Results render as cards sorted by proximity, each showing the provider's
photo, average rating, services offered as chips, distance, years of experience, and a verified badge if applicable.
Recent searches are kept as quick-access chips so re-running yesterday's query is one tap.

Tap a provider to see their full profile — bio, all services with hourly rates, weekly availability calendar, and
paginated reviews from past owners. Hit "Book Now" and a five-step flow takes over: pick a date and time slot, pick
which pet the booking is for, choose a service location (the pet's home, the provider's location, or a custom address —
limited to whatever sources the provider supports), add notes, and pay via Stripe. The booking lands in "My Bookings" as
pending until the provider confirms.

Once a service is in progress, the owner gets the most emotionally important screen in the app: a full-screen map
showing the provider's live GPS as an animated marker, the walk trail drawn as a polyline, an elapsed timer, and an
in-app chat panel — so a pet parent sitting at work can see their dog is fine right now, on this street, three minutes
ago. When it's done, the owner gets a prompt to leave a star rating and review.

Owners can also set up recurring booking series (every Monday at 8am), favorite providers they've enjoyed working with,
and pay via saved cards so re-booking is one tap.

## Provider experience

Providers configure a public profile with a bio, base address, experience start year, and a per-service catalog: each
entry has a service type, hourly rate, booking mode (fixed appointment slots vs. open availability windows), default
duration, and which location sources are supported (at the pet's home, at the provider's place, or wherever the owner
picks).

A weekly availability builder lets the provider declare working hours — Monday 9–12 and 14–18, etc. — and a separate
time-off list handles vacations and one-off blackouts. To prevent double-booking against the rest of their life,
providers connect their Google Calendar via OAuth: every 30 minutes the system reads free/busy windows from their
primary calendar and excludes those times from the public booking slots. We never see event titles — just busy windows.

Bookings flow through a Requests → Upcoming → Active → Past tab structure. From the booking detail screen the provider
confirms (which charges the owner's card via Stripe), starts the service (which kicks off live GPS tracking on mobile),
and ends it (which finalizes the walk trail). An earnings dashboard shows month-to-date and lifetime totals; payouts go
through Stripe Connect with a 15% platform fee.

## Platform and polish

The app ships on web (Next.js 14, App Router) and mobile (Expo / React Native), with the same shared TypeScript
contracts so the two clients are always in lockstep. Five languages out of the box — English, Russian, Spanish, Hebrew,
Chinese — with right-to-left support for Hebrew. Per-user preferences for unit system (metric vs imperial) and display
currency (USD / EUR / ILS) live in the avatar menu so they're never more than two clicks away.

Auth is brokered by AWS Cognito (with cognito-local for dev) — sign-up, sign-in, MFA, password reset all happen
client-side; the backend only verifies JWTs and never sees passwords. Photo uploads go directly to S3 via pre-signed PUT
URLs, with MinIO as the dev stand-in. Real-time chat and GPS tracking ride on Fastify WebSocket gateways with Redis
pub/sub for fan-out. Push notifications go through Expo on mobile and a WebSocket channel on web.

Locally, the entire stack runs from a single `make bootstrap` against Docker — Postgres, Redis, MinIO, cognito-local,
pgAdmin — with zero AWS keys required. Stripe has an in-process dev mock so the booking-and-pay flow works end-to-end
without a Stripe account. The same code paths hit real AWS and real Stripe in production by setting env vars.
