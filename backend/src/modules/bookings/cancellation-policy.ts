/**
 * Pure cancellation policy. M4 (payments) reads these numbers
 * to actually move money via Stripe.
 *
 * Rules (all amounts in cents):
 *   • Owner cancels  ≥ 2h before event  → full refund, app fee 0.
 *   • Owner cancels  <  2h before event → no refund, app keeps APP_LATE_FEE_PCT
 *     of the booking total as a late-cancel fee. (Provider gets nothing in this
 *     M2-side bookkeeping; M4 may credit the provider for showing up — TBD.)
 *   • Provider cancels (any time)       → full refund to owner, provider owes
 *     PROVIDER_NO_SHOW_FEE_PCT of the booking total to the app.
 */

export const LATE_CANCEL_HOURS = 2;
export const APP_LATE_FEE_PCT = 0.15;          // 15% kept on owner late-cancel
export const PROVIDER_NO_SHOW_FEE_PCT = 0.15;  // 15% charged when provider cancels

export interface CancellationOutcome {
  refundCents: number;
  appFeeCents: number;
  providerFeeCents: number;
}

export function computeCancellationOutcome(input: {
  priceCents: number;
  scheduledAt: Date;
  now: Date;
  cancelledBy: 'owner' | 'provider';
}): CancellationOutcome {
  const { priceCents, scheduledAt, now, cancelledBy } = input;
  const hoursToEvent = (scheduledAt.getTime() - now.getTime()) / 3_600_000;

  if (cancelledBy === 'owner') {
    if (hoursToEvent >= LATE_CANCEL_HOURS) {
      return { refundCents: priceCents, appFeeCents: 0, providerFeeCents: 0 };
    }
    return {
      refundCents: 0,
      appFeeCents: Math.round(priceCents * APP_LATE_FEE_PCT),
      providerFeeCents: 0,
    };
  }

  // Provider cancellation — owner made whole, provider penalized.
  return {
    refundCents: priceCents,
    appFeeCents: 0,
    providerFeeCents: Math.round(priceCents * PROVIDER_NO_SHOW_FEE_PCT),
  };
}
