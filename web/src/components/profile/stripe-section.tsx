'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

import type { StripeAccount } from '@petwalker/shared';

export function StripeSection(): JSX.Element {
  const qc = useQueryClient();

  const account = useQuery<StripeAccount | null>({
    queryKey: ['stripe-account'],
    queryFn: () => api.payments.account(),
  });

  const earnings = useQuery({
    queryKey: ['earnings'],
    queryFn: () => api.payments.earnings(),
  });

  const onboard = useMutation({
    mutationFn: () => api.payments.connectOnboard(),
    onSuccess: (link) => {
      // The dev mock auto-completes onboarding via webhook; in real Stripe
      // the user lands on Stripe's hosted onboarding flow.
      window.open(link.url, '_blank', 'noopener,noreferrer');
      void qc.invalidateQueries({ queryKey: ['stripe-account'] });
    },
  });

  if (account.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  const hasAccount = !!account.data;
  const onboarded = account.data?.chargesEnabled === true;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Status</p>
          <p
            className={[
              'text-xs',
              onboarded
                ? 'text-emerald-600'
                : hasAccount
                  ? 'text-amber-600'
                  : 'text-slate-500',
            ].join(' ')}
          >
            {onboarded
              ? 'Onboarded — ready to receive payouts'
              : hasAccount
                ? 'Pending — finish Stripe onboarding'
                : 'Not started'}
          </p>
        </div>
        <Button onClick={() => onboard.mutate()} disabled={onboard.isPending}>
          {onboard.isPending
            ? 'Opening…'
            : onboarded
              ? 'Update Stripe info'
              : hasAccount
                ? 'Resume onboarding'
                : 'Set up Stripe'}
        </Button>
      </div>

      {earnings.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Gross" value={fmtMoney(earnings.data.totalCents)} />
          <Stat
            label="App fees"
            value={`-${fmtMoney(earnings.data.totalCents - earnings.data.payoutCents)}`}
          />
          <Stat label="Net payout" value={fmtMoney(earnings.data.payoutCents)} />
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Platform fee: 15% of each booking. Refunds reduce payout proportionally.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}
