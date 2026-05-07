import { describe, expect, it } from 'vitest';

import {
  APP_LATE_FEE_PCT,
  computeCancellationOutcome,
  LATE_CANCEL_HOURS,
  PROVIDER_NO_SHOW_FEE_PCT,
} from './cancellation-policy.js';

const PRICE = 3000; // $30.00
const NOW = new Date('2027-01-04T10:00:00Z');

function at(hoursBeforeNow: number): Date {
  return new Date(NOW.getTime() + hoursBeforeNow * 3_600_000);
}

describe('computeCancellationOutcome', () => {
  describe('owner cancels', () => {
    it(`≥ ${LATE_CANCEL_HOURS}h before event → full refund, no fees`, () => {
      const out = computeCancellationOutcome({
        priceCents: PRICE,
        scheduledAt: at(LATE_CANCEL_HOURS + 1),
        now: NOW,
        cancelledBy: 'owner',
      });
      expect(out).toEqual({ refundCents: PRICE, appFeeCents: 0, providerFeeCents: 0 });
    });

    it(`exactly ${LATE_CANCEL_HOURS}h before event → still full refund (boundary)`, () => {
      const out = computeCancellationOutcome({
        priceCents: PRICE,
        scheduledAt: at(LATE_CANCEL_HOURS),
        now: NOW,
        cancelledBy: 'owner',
      });
      expect(out.refundCents).toBe(PRICE);
      expect(out.appFeeCents).toBe(0);
    });

    it(`< ${LATE_CANCEL_HOURS}h before event → no refund, app keeps ${APP_LATE_FEE_PCT * 100}%`, () => {
      const out = computeCancellationOutcome({
        priceCents: PRICE,
        scheduledAt: at(1),
        now: NOW,
        cancelledBy: 'owner',
      });
      expect(out).toEqual({
        refundCents: 0,
        appFeeCents: Math.round(PRICE * APP_LATE_FEE_PCT),
        providerFeeCents: 0,
      });
    });

    it('event already started (negative hours) → late-cancel terms', () => {
      const out = computeCancellationOutcome({
        priceCents: PRICE,
        scheduledAt: at(-0.5),
        now: NOW,
        cancelledBy: 'owner',
      });
      expect(out.refundCents).toBe(0);
      expect(out.appFeeCents).toBeGreaterThan(0);
    });
  });

  describe('provider cancels', () => {
    it(`any time → full refund + provider owes ${PROVIDER_NO_SHOW_FEE_PCT * 100}%`, () => {
      for (const h of [10, 1, 0.5, -1]) {
        const out = computeCancellationOutcome({
          priceCents: PRICE,
          scheduledAt: at(h),
          now: NOW,
          cancelledBy: 'provider',
        });
        expect(out).toEqual({
          refundCents: PRICE,
          appFeeCents: 0,
          providerFeeCents: Math.round(PRICE * PROVIDER_NO_SHOW_FEE_PCT),
        });
      }
    });
  });

  describe('rounding', () => {
    it('app fee on $33.33 booking, late owner cancel', () => {
      const out = computeCancellationOutcome({
        priceCents: 3333,
        scheduledAt: at(1),
        now: NOW,
        cancelledBy: 'owner',
      });
      // 3333 * 0.15 = 499.95 → 500
      expect(out.appFeeCents).toBe(500);
    });
  });
});
