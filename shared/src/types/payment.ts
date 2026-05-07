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
