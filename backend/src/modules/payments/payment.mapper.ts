import type { PaymentRow, StripeAccountRow } from '../../db/schema/index.js';

import type { Payment, StripeAccount } from '@petwalker/shared';

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    bookingId: row.bookingId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    stripeChargeId: row.stripeChargeId ?? null,
    amountCents: row.amountCents,
    applicationFeeCents: row.applicationFeeCents,
    refundedCents: row.refundedCents,
    currency: row.currency,
    status: row.status,
    failureReason: row.failureReason ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapStripeAccountRow(row: StripeAccountRow): StripeAccount {
  return {
    userId: row.userId,
    stripeAccountId: row.stripeAccountId,
    chargesEnabled: row.chargesEnabled,
    payoutsEnabled: row.payoutsEnabled,
    detailsSubmitted: row.detailsSubmitted,
    updatedAt: row.updatedAt.toISOString(),
  };
}
