import { z } from 'zod';

/** Owner pays for a booking — returns a Stripe PaymentIntent client secret. */
export const CreatePaymentIntentDto = z.object({
  bookingId: z.string().uuid(),
});
export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentDto>;

export const PaymentIntentResponse = z.object({
  paymentIntentId: z.string(),
  clientSecret: z.string(),
});
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponse>;

/** Walker onboards to Stripe Connect — returns the Express onboarding link. */
export const StripeConnectOnboardResponse = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type StripeConnectOnboardResponse = z.infer<typeof StripeConnectOnboardResponse>;

/**
 * Owner clicks "Add card" → backend mints a SetupIntent and returns its
 * client secret so Stripe.js Elements can collect the card client-side.
 *
 * In dev mode the response also carries a `dev: true` flag so the UI can
 * render its built-in fake-card form instead of pulling Stripe.js (which
 * needs a publishable key we don't have without real Stripe credentials).
 */
export const SetupIntentResponse = z.object({
  setupIntentId: z.string(),
  clientSecret: z.string(),
  /** True when the backend's StripeService is the in-process dev mock. */
  dev: z.boolean(),
});
export type SetupIntentResponse = z.infer<typeof SetupIntentResponse>;

/**
 * Dev-only fast path. Lets the dev UI mint a fake `pm_dev_*` directly
 * without going through Stripe.js. Brand/last4/exp are user-supplied so
 * we can demo multiple cards on one customer. Real Stripe never sees
 * this — the controller refuses the call when StripeService is real.
 */
export const DevAttachPaymentMethodDto = z.object({
  brand: z.enum(['visa', 'mastercard', 'amex']),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2099),
  /** Optional — defaults to false. The first card auto-becomes default. */
  makeDefault: z.boolean().optional(),
});
export type DevAttachPaymentMethodDto = z.infer<typeof DevAttachPaymentMethodDto>;

/**
 * Cursor-paginated billing history query. The cursor is the previous
 * page's last `paymentId` — it's serialised opaquely on the wire.
 */
export const BillingHistoryQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type BillingHistoryQuery = z.infer<typeof BillingHistoryQuery>;
