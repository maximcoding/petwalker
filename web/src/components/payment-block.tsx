'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

import type { Payment } from '@petwalker/shared';

interface Props {
  bookingId: string;
  isOwner: boolean;
}

/**
 * Shows the payment status for a booking + (for the owner) lets them pay.
 *
 * In dev mode the "Pay" button hits `/payments/dev/confirm/:id` which fires
 * the in-process webhook → the payment row flips to succeeded → the booking
 * auto-flips from pending → confirmed. In real Stripe mode the button mounts
 * Stripe Elements (M5 polish), but for M4 dev the no-elements flow is the
 * verified path.
 */
export function PaymentBlock({ bookingId, isOwner }: Props): JSX.Element | null {
  const qc = useQueryClient();
  const payment = useQuery<Payment | null>({
    queryKey: ['payment', bookingId],
    queryFn: () => api.payments.forBooking(bookingId),
    refetchInterval: 3000, // poll while we wait for the webhook to land
  });

  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null);

  const createIntent = useMutation({
    mutationFn: () => api.payments.createIntent({ bookingId }),
    onSuccess: (resp) => {
      setPendingIntentId(resp.paymentIntentId);
      void qc.invalidateQueries({ queryKey: ['payment', bookingId] });
    },
  });

  const devConfirm = useMutation({
    mutationFn: (paymentIntentId: string) =>
      api.payments.devConfirm(paymentIntentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payment', bookingId] });
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
  });

  // Once an intent is created, immediately fire the dev-mock confirm. Real
  // Stripe would mount Elements here instead.
  useEffect(() => {
    if (!pendingIntentId) return;
    devConfirm.mutate(pendingIntentId);
    setPendingIntentId(null);
  }, [pendingIntentId, devConfirm]);

  if (payment.isLoading) return null;

  const p = payment.data;
  const status = p?.status ?? 'unpaid';

  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Payment</p>
          <p className={statusTone(status)}>
            {humanise(status)}
            {p ? ` — ${fmtMoney(p.amountCents)}` : ''}
            {p && p.refundedCents > 0 ? ` · refunded ${fmtMoney(p.refundedCents)}` : ''}
          </p>
        </div>
        {isOwner && (status === 'unpaid' || status === 'failed') ? (
          <Button
            disabled={createIntent.isPending || devConfirm.isPending}
            onClick={() => createIntent.mutate()}
          >
            {createIntent.isPending || devConfirm.isPending
              ? 'Processing…'
              : status === 'failed'
                ? 'Retry payment'
                : 'Pay now'}
          </Button>
        ) : null}
      </div>
      {p?.failureReason ? (
        <p className="mt-2 text-xs text-red-600">{p.failureReason}</p>
      ) : null}
    </section>
  );
}

function humanise(s: string): string {
  switch (s) {
    case 'unpaid':
      return 'Not paid yet';
    case 'requires_action':
      return 'Awaiting payment';
    case 'processing':
      return 'Processing…';
    case 'succeeded':
      return 'Paid';
    case 'failed':
      return 'Payment failed';
    case 'refunded':
      return 'Refunded';
    default:
      return s;
  }
}

function statusTone(s: string): string {
  if (s === 'succeeded') return 'text-xs text-emerald-600';
  if (s === 'failed') return 'text-xs text-red-600';
  if (s === 'refunded') return 'text-xs text-slate-500';
  return 'text-xs text-slate-500';
}

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}
