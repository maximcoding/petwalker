# @petwalker/mobile

Expo SDK 50+ (React Native) — primary client for owners and walkers.

> **Status:** scaffolded (Phase 7 will run `npx create-expo-app` and wire navigation).

Planned layout:

```
mobile/src/
├── app/                   expo-router file-based routes
│   ├── (auth)/            sign-in, sign-up, confirm
│   ├── (tabs)/            home, bookings, chat, profile
│   ├── walk/[id]/         active walk screen (GPS + chat)
│   └── _layout.tsx
├── components/
├── lib/
│   ├── api.ts             new PetwalkerApi({...})
│   ├── auth.ts            Cognito (amazon-cognito-identity-js or Amplify)
│   ├── push.ts            Expo notifications + token registration
│   └── tracking.ts        background GPS + WS gateway client
└── assets/
```
