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
