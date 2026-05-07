import { useStripe } from '@stripe/stripe-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { api } from '@/lib/api';

import type { Payment } from '@petwalker/shared';

interface Props {
  bookingId: string;
}

/**
 * Owner-side payment trigger.
 *
 * Two paths through PaymentSheet:
 *
 *   1. PROD (Stripe publishable key set, real backend keys):
 *      → POST /payments/intent → init PaymentSheet with the returned client
 *        secret → present sheet. PaymentSheet auto-includes Apple Pay (if
 *        merchantIdentifier configured + the device has a card in Wallet)
 *        and Google Pay (if device supports it). Cards always work.
 *
 *   2. DEV (no Stripe key, in-process mock):
 *      → POST /payments/intent returns `pi_dev_*_secret_dev`.
 *      → Skip PaymentSheet entirely (the mock has no native Stripe SDK
 *        connection) and call POST /payments/dev/confirm/:id which fires the
 *        in-process `payment_intent.succeeded` webhook → backend flips
 *        booking → web/mobile poll picks up the change.
 *
 * Either way the user experience is the same: tap "Pay", see "Paid" within
 * a second.
 */
export function PayButton({ bookingId }: Props): JSX.Element | null {
  const qc = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);

  const payment = useQuery<Payment | null>({
    queryKey: ['payment', bookingId],
    queryFn: () => api.payments.forBooking(bookingId),
    refetchInterval: 3000, // poll while we wait for the webhook
  });

  const status = payment.data?.status ?? 'unpaid';

  const create = useMutation({
    mutationFn: () => api.payments.createIntent({ bookingId }),
  });

  async function pay(): Promise<void> {
    setBusy(true);
    try {
      const intent = await create.mutateAsync();
      const isDev = intent.clientSecret.endsWith('_secret_dev');

      if (isDev) {
        // Dev path: backend mock, no native sheet.
        await api.payments.devConfirm(intent.paymentIntentId);
      } else {
        // Prod path: real Stripe — open PaymentSheet (Apple Pay / Google Pay /
        // cards all live in the same sheet).
        const init = await initPaymentSheet({
          paymentIntentClientSecret: intent.clientSecret,
          merchantDisplayName: 'petwalker',
          // Wallet payments are auto-included when the device + Stripe acct
          // support them; no extra config needed here beyond merchantIdentifier
          // on <StripeProvider>.
          applePay: { merchantCountryCode: 'US' },
          googlePay: { merchantCountryCode: 'US', testEnv: true },
          allowsDelayedPaymentMethods: false,
        });
        if (init.error) throw new Error(init.error.message);

        const sheet = await presentPaymentSheet();
        if (sheet.error) {
          // User cancelled is not an error — just bail.
          if (sheet.error.code === 'Canceled') return;
          throw new Error(sheet.error.message);
        }
      }

      // Either path: webhook fires, payment + booking caches go stale.
      void qc.invalidateQueries({ queryKey: ['payment', bookingId] });
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (e) {
      Alert.alert('Payment failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (payment.isLoading) return null;

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontWeight: '600' }}>Payment</Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              color:
                status === 'succeeded'
                  ? '#059669'
                  : status === 'failed'
                    ? '#dc2626'
                    : '#64748b',
            }}
          >
            {humaniseStatus(status)}
            {payment.data ? ` — $${(payment.data.amountCents / 100).toFixed(2)}` : ''}
            {payment.data && payment.data.refundedCents > 0
              ? ` · refunded $${(payment.data.refundedCents / 100).toFixed(2)}`
              : ''}
          </Text>
        </View>
        {status === 'unpaid' || status === 'failed' ? (
          <Pressable
            onPress={pay}
            disabled={busy}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: busy ? '#94a3b8' : '#4456f0',
            }}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {status === 'failed' ? 'Retry payment' : 'Pay'}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {payment.data?.failureReason ? (
        <Text style={{ fontSize: 12, color: '#dc2626' }}>{payment.data.failureReason}</Text>
      ) : null}
    </View>
  );
}

function humaniseStatus(s: string): string {
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
