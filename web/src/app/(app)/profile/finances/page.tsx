'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { BillingHistorySection } from '@/components/profile/billing-history-section';
import { Card } from '@/components/profile/card';
import { PaymentMethodsSection } from '@/components/profile/payment-methods-section';
import { StripeSection } from '@/components/profile/stripe-section';
import { useViewMode } from '@/contexts/view-mode-context';
import { api } from '@/lib/api';


/**
 * Finances tab — the money-touching surface.
 *
 * Saved payment methods, billing history with downloadable invoice PDFs,
 * and (provider-only) Stripe Connect payouts. Display-currency moved to
 * the Preferences tab — it's a UI preference, not a money concern.
 */
export default function FinancesPage(): JSX.Element {
  const { t } = useTranslation();
  const { mode } = useViewMode();
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  if (me.isLoading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }
  if (me.error) {
    return <p className="text-sm text-red-600">Error: {(me.error as Error).message}</p>;
  }
  if (!me.data) {
    return <p className="text-sm text-slate-500">Not signed in.</p>;
  }

  // Payouts row is provider-only; gate by active view mode (not role)
  // so a `both` user toggling to Owner mode hides it.
  const isProviderView = mode === 'provider';

  return (
    <div className="space-y-6">
      <Card
        title={t('finances.paymentMethods.title')}
        hint={t('finances.paymentMethods.hint')}
      >
        <PaymentMethodsSection />
      </Card>

      <Card
        title={t('finances.billingHistory.title')}
        hint={t('finances.billingHistory.hint')}
      >
        <BillingHistorySection />
      </Card>

      {isProviderView ? (
        <Card title={t('profile.payouts')}>
          <StripeSection />
        </Card>
      ) : null}
    </div>
  );
}

