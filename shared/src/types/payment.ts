import type { PaymentStatus } from '../enums/payment-status.js';

import type { ISODateString, UUID } from './common.js';

export interface StripeAccount {
  userId: UUID;
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  updatedAt: ISODateString;
}

export interface Payment {
  id: UUID;
  bookingId: UUID;
  stripePaymentIntentId: string;
  stripeChargeId?: string | null;
  amountCents: number;
  applicationFeeCents: number;
  refundedCents: number;
  currency: string; // ISO-4217, e.g. 'USD'
  status: PaymentStatus;
  failureReason?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * A vaulted card on the user's Stripe Customer. Surfaced in the Settings
 * Hub > Finances > Payment methods card.
 *
 * Real Stripe returns far more — we expose only what's needed to render
 * a row (brand + last4 + expiry) plus the id (so the user can remove it)
 * and a `default` flag (used to mark the auto-pick at checkout time).
 */
export interface SavedPaymentMethod {
  /** Stripe payment method id (`pm_...` real or `pm_dev_...` mock). */
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  /** True when this is the customer's invoice_settings.default_payment_method. */
  isDefault: boolean;
  /** True when minted by StripeDevService (no real network involvement). */
  dev: boolean;
}

/**
 * One row on the billing history table. Aggregated from the `payments`
 * table joined to `bookings`. Includes refund and fee fields so the UI
 * can show a tidy net-paid number per row without doing the math.
 */
export interface BillingHistoryEntry {
  paymentId: UUID;
  bookingId: UUID;
  occurredAt: ISODateString;
  amountCents: number;
  refundedCents: number;
  /** Net = amount − refunded, computed server-side for ordering. */
  netCents: number;
  currency: string;
  status: PaymentStatus;
  /** What was booked, surfaced for the row label. */
  serviceType: string;
  /** Counterparty's display name (provider's, from the owner's POV). */
  counterpartyName: string | null;
}
