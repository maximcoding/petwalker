# @petwalker/web

Next.js 14 (App Router) — full owner/walker portal + landing.

> **Status:** scaffolded (Phase 6 will populate routes, auth, layouts).

Planned layout:

```
web/src/
├── app/
│   ├── (marketing)/      landing, about, terms
│   ├── (auth)/           sign-in, sign-up, confirm
│   ├── (owner)/          /pets, /bookings, /walkers, /walks/:id
│   ├── (walker)/         /availability, /schedule, /earnings
│   └── api/              minimal edge routes (proxy if needed)
├── components/           shared UI primitives
├── lib/
│   ├── api.ts            new PetwalkerApi({...})
│   └── auth.ts           Cognito session via Amplify Auth
└── styles/
```
