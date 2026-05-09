# docs/ — index

Everything you'd want to read about petwalker. The repo root README is intentionally lean — it's a project entry point that points here.

## Read in this order

1. **[`architecture.md`](./architecture.md)** — what the system is, the tech stack, every backend module, every DB table, and how auth/payments/realtime are wired. Start here if you're new to the codebase.
2. **[`setup.md`](./setup.md)** — single source of truth for local dev, every external service (Postgres, Redis, S3, Cognito, Stripe, Google Calendar, Expo Push), and every env var. Start here if you're trying to get something running.
3. **[`roadmap.md`](./roadmap.md)** — milestones M1 → M6 in dependency order, with backend / web / mobile task breakdowns each.

## Operational runbooks

Deep-dives for specific subsystems. `setup.md` summarises and links to these.

- **[`payments.md`](./payments.md)** — moving Stripe from dev mock to test → live, enabling Apple Pay (Merchant ID + cert + Xcode entitlement), enabling Google Pay, production hardening checklist.
- **[`google-calendar-setup.md`](./google-calendar-setup.md)** — provider-side "Connect Google Calendar" flow. Google Cloud Console steps, env vars, smoke test.

## Reference

- **[`testing.md`](./testing.md)** — manual smoke-test checklist. Tick as you verify per milestone. Automated tests live in `web/e2e/README.md` (Playwright).
- **[`product-brief.md`](./product-brief.md)** — the original product/design brief. Brand personality, screen-by-screen UX intent, component inventory. Pre-implementation; the current build has diverged in places (notes inline). Historical but useful for understanding *why* a screen looks the way it does.
- **[`scaffold-plan.md`](./scaffold-plan.md)** — the original 2026-05-05 scaffold plan. Decisions log: why Cognito from day 1, why jsonb polylines, etc. Historical, but useful for context.

## House rules

- One topic per file. New external service? It registers itself in `setup.md` (see "How to add a new external service" at the bottom of that doc) and gets its own deep-dive runbook only if the setup is more than ~5 steps.
- The repo root README links to `setup.md` and this index. Don't add setup steps to the README — they belong here.
- Cross-link instead of duplicating. If something already lives in another doc, link to it.
