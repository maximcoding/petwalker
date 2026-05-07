# Payments — Stripe Connect + Apple Pay / Google Pay

This is the operational runbook for moving the payments subsystem from
**dev mock** (zero keys, in-process webhook emitter) to **real Stripe**
(test mode or live), and on to **wallet payments** (Apple Pay, Google Pay).

The dev mock is the default. Nothing below is required for local development —
sign up, book, pay, refund all work end-to-end without any Stripe account.

---

## Architecture (one-paragraph recap)

`StripeService` is an interface with two implementations:
`StripeRealService` (wraps the official `stripe` Node SDK) and
`StripeDevService` (purely local — fake `acct_dev_*` / `pi_dev_*` / `ch_dev_*`
IDs, in-process EventEmitter for webhooks). The factory in `PaymentsModule`
picks based on `env.STRIPE_SECRET_KEY` presence: set the env var, you get
real Stripe; leave it unset, you get the mock. The `payments` table is the
system of record for what the user sees; Stripe is the system of record for
money movement; webhooks reconcile.

Key files:

- `backend/src/modules/payments/stripe.service.ts` — interface + both impls + factory
- `backend/src/modules/payments/payments.service.ts` — domain logic, webhook reconciler
- `backend/src/modules/payments/payments.controller.ts` — REST surface
- `web/src/components/payment-block.tsx` — owner pay surface on web
- `mobile/src/components/PayButton.tsx` — owner pay surface on mobile (PaymentSheet)
- `mobile/app/_layout.tsx` — `<StripeProvider>` wiring

---

## Env vars at a glance

| Env var | Where | When | Effect |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | backend `.env` | move to real Stripe | factory wires `StripeRealService` |
| `STRIPE_WEBHOOK_SECRET` | backend `.env` | move to real Stripe | `/payments/webhook` verifies `Stripe-Signature` |
| `STRIPE_CONNECT_CLIENT_ID` | backend `.env` | optional, only for OAuth Connect (we use Express Connect → not required) | unused today |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | web `.env` | move to real Stripe | future Stripe Elements card UI |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | mobile `.env` | move to real Stripe | mobile `<StripeProvider>` mounts; PaymentSheet works |
| `EXPO_PUBLIC_STRIPE_MERCHANT_ID` | mobile `.env` | enable Apple Pay | `merchantIdentifier` passed to `<StripeProvider>` |

Anything not set falls back to the dev mock. There's no "half-enabled" state.

---

## 1. Stay on dev mock (default)

**Nothing to do.** Boot the stack with `make up && pnpm dev`, sign in two
accounts, switch one to Provider, set up offerings/availability, book from
the other, click Pay → done.

What works:
- Stripe Connect onboarding (button → mock URL → in-process `account.updated`)
- PaymentIntent creation + auto-confirm (mock fires `payment_intent.succeeded`
  ~800 ms after `devConfirm`)
- Booking auto-flips `pending → confirmed` when the webhook lands
- Cancellation refunds (mock fires `charge.refunded`)
- Earnings summary

What doesn't:
- Apple Pay / Google Pay (require real Stripe; the dev mock has no native
  Stripe SDK connection — mobile detects `pi_dev_*_secret_dev` and skips
  PaymentSheet entirely, calling `POST /payments/dev/confirm/:id` instead)

---

## 2. Move to real Stripe (test mode)

### 2.1 Get the keys

1. Sign up / log in at https://dashboard.stripe.com/test/dashboard.
2. Developers → API keys.
   - **Publishable key** (`pk_test_…`) — safe to ship to clients.
   - **Secret key** (`sk_test_…`) — backend only.
3. Developers → Webhooks → "Add endpoint".
   - URL: `https://<your-tunnel>/payments/webhook` (use ngrok / tailscale /
     cloudflared while developing).
   - Events to send (minimum): `account.updated`,
     `payment_intent.succeeded`, `payment_intent.payment_failed`,
     `charge.refunded`.
   - After saving, copy the **Signing secret** (`whsec_…`).

### 2.2 Set env vars

```bash
# .env (backend)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# .env (web — Next.js public env)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# .env (mobile — Expo public env)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 2.3 Restart and tunnel

```bash
# backend
pnpm --filter @petwalker/backend dev    # restart picks up the env

# webhook tunnel (in a separate terminal)
ngrok http 3001
# OR Stripe's CLI which auto-rewrites webhook URLs:
stripe listen --forward-to localhost:3001/payments/webhook
```

The factory now wires `StripeRealService`. The dev `/payments/dev/confirm/:id`
endpoint will return a 409 if you call it (real impl doesn't allow it).

### 2.4 Verify

- Provider Profile → Payouts → "Set up Stripe" → opens hosted Express
  onboarding → fill in test info (Stripe pre-fills with test data) → close
  the tab. Within ~5s the webhook fires and the status pill flips to
  "Onboarded".
- Owner books a service, taps Pay on web. Stripe Elements / mobile
  PaymentSheet appears. Use Stripe's test card `4242 4242 4242 4242`,
  any future expiry, any CVC.
- Webhook fires → booking auto-flips to confirmed.

> **Production note:** the current backend handler stringifies `req.body`
> before HMAC-verifying. That's fine for dev/test where Stripe sends
> canonical JSON, but for production deployment you should add
> `fastify-raw-body` and feed the raw bytes to
> `stripe.webhooks.constructEvent`. Marked as a deploy-checklist item;
> not required for test-mode validation.

---

## 3. Enable Google Pay

Google Pay works in Stripe **test mode** with **zero extra config** — just
having the publishable key and `googlePay: { merchantCountryCode: 'US',
testEnv: true }` (already wired in `mobile/src/components/PayButton.tsx`).

The Pay button on Android shows the Google Pay row in PaymentSheet
automatically when:
- The device supports Google Pay (most do)
- `testEnv: true` while in Stripe test mode
- The publishable key is set

For production:
1. Set `testEnv: false` in `mobile/src/components/PayButton.tsx`
   (`initPaymentSheet({ googlePay: { merchantCountryCode: 'US', testEnv: false } })`).
2. Sign your APK with a release keystore.
3. Submit your app to the [Google Pay business console](https://pay.google.com/business/console)
   for production access (Stripe handles most of this transparently — see
   their [Google Pay docs](https://docs.stripe.com/payments/google-pay)).

---

## 4. Enable Apple Pay

This is the involved one — Apple's gates, not Stripe's.

### 4.1 Apple Merchant ID

1. https://developer.apple.com/account/resources/identifiers → Merchant IDs → "+".
2. Description: `petwalker production` (or whatever).
3. Identifier: `merchant.com.petwalker.app` (must be globally unique within
   Apple; pick something namespaced under your reverse-domain).
4. Save.

### 4.2 Apple Pay Certificate (uploaded to Stripe)

1. https://dashboard.stripe.com/settings/payments/apple_pay → "Add new
   application" → enter the merchant identifier from step 4.1.
2. Stripe gives you a CSR file. Download it.
3. Back in Apple Developer → Certificates → "+" → Apple Pay Payment
   Processing Certificate → choose your merchant ID → upload Stripe's CSR
   → download the resulting .cer.
4. Upload the .cer back to Stripe Dashboard → Apple Pay settings.

### 4.3 Xcode entitlement

This requires graduating from Expo Go to a custom dev client (Apple Pay's
native bridge isn't in Expo Go).

```bash
cd mobile
npx expo prebuild
# opens ios/petwalker.xcworkspace
```

In Xcode:
1. Open the project in `mobile/ios/`.
2. Select the target → Signing & Capabilities → "+ Capability" →
   Apple Pay.
3. Add your Merchant ID (`merchant.com.petwalker.app`) to the list.
4. Build to a real device (Apple Pay does not work in the simulator unless
   you're running Xcode 14+ with the simulated wallet).

### 4.4 Set the mobile env

```bash
# .env
EXPO_PUBLIC_STRIPE_MERCHANT_ID=merchant.com.petwalker.app
```

This flows through `app/_layout.tsx` → `<StripeProvider merchantIdentifier={...}>`.

### 4.5 Build + verify

```bash
# Custom dev client (NOT Expo Go) — required for native Apple Pay
npx expo run:ios --device
```

On a device with a card in Apple Wallet, tap Pay on a booking → PaymentSheet
opens → Apple Pay row appears at the top → tap → Face ID / Touch ID → done.

**Common gotchas:**
- The simulator does not show Apple Pay unless explicitly configured. Test on
  a real device.
- If the Apple Pay row is missing, check Stripe Dashboard → Payment methods
  → Apple Pay is "Active". If not, the merchant cert hasn't been linked.
- Apple Pay only appears for `currency: USD` (and a handful of others) by
  default. Other currencies require Stripe Dashboard activation.

---

## 5. Production hardening (M6 work)

Tracked here so we don't forget when shipping:

- **Raw-body webhook handling** — register `fastify-raw-body` and pass the
  raw `Buffer` to `stripe.webhooks.constructEvent` instead of restringifying.
- **Webhook idempotency persistence** — current impl uses in-memory
  `seenEventIds`; restarts lose the dedupe window. Move to a small
  `webhook_events` table keyed by `event.id`.
- **Application fee config** — currently hardcoded 15% in two places
  (`PaymentsService.createIntentForBooking` and
  `bookings/cancellation-policy.ts`). Move to env or a single shared constant
  module.
- **Currency** — hardcoded USD throughout. Multi-currency would need
  per-provider currency, exchange-rate handling, and Stripe currency
  conversion.
- **Webhook secret rotation** — Stripe lets you have multiple endpoints with
  different secrets; rotate without downtime by registering a new endpoint,
  swapping the env, then deleting the old.
- **Strong customer authentication (SCA)** — already handled by PaymentSheet;
  no extra code, but worth verifying with Stripe's test card
  `4000 0025 0000 3155` (always requires 3DS).

---

## Quick reference — what to do when

| You want to … | Do this |
| --- | --- |
| Develop locally, no internet | Nothing — dev mock is the default |
| Test real Stripe flows on web | Set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, run `stripe listen` |
| Test cards on mobile | Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to mobile env |
| Test Google Pay | Set the mobile publishable key, build to Android device, use Stripe test card in Google Wallet |
| Test Apple Pay | Section 4 above (Merchant ID + cert + Xcode entitlement + custom dev client + real iOS device) |
| Switch to live | Replace `pk_test_…` / `sk_test_…` with `pk_live_…` / `sk_live_…`, swap webhook to a public URL, set `testEnv: false` for Google Pay |
