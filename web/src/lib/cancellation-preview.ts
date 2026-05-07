/**
 * Mirror of `backend/src/modules/bookings/cancellation-policy.ts` for showing
 * a refund preview in the cancel-confirmation dialog. Keep in sync.
 *
 * Policy:
 *   • Owner cancel ≥ 2h before scheduledAt → 100% refund, no fees.
 *   • Owner cancel < 2h before               → $0 refund, 15% app fee.
 *   • Provider cancel anytime                → 100% refund + 15% provider fee.
 */
export interface CancellationOutcome {
  refundCents: number;
  appFeeCents: number;
  providerFeeCents: number;
}

const APP_FEE_PCT = 0.15;
const GRACE_HOURS = 2;

export function previewCancellation(input: {
  priceCents: number;
  scheduledAt: string;
  cancelledBy: 'owner' | 'provider';
  now?: Date;
}): CancellationOutcome {
  const now = (input.now ?? new Date()).getTime();
  const scheduled = new Date(input.scheduledAt).getTime();
  const hoursUntil = (scheduled - now) / 3_600_000;

  if (input.cancelledBy === 'provider') {
    return {
      refundCents: input.priceCents,
      appFeeCents: 0,
      providerFeeCents: Math.round(input.priceCents * APP_FEE_PCT),
    };
  }
  // owner
  if (hoursUntil >= GRACE_HOURS) {
    return { refundCents: input.priceCents, appFeeCents: 0, providerFeeCents: 0 };
  }
  return {
    refundCents: 0,
    appFeeCents: Math.round(input.priceCents * APP_FEE_PCT),
    providerFeeCents: 0,
  };
}
