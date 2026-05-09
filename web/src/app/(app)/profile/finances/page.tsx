'use client';

import { UserRole } from '@petwalker/shared/enums';
import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/profile/card';
import { CurrencySection } from '@/components/profile/currency-section';
import { StripeSection } from '@/components/profile/stripe-section';
import { api } from '@/lib/api';


/**
 * Finances tab — the money-touching surface.
 *
 * Currency preference applies to everyone. Payouts are provider-only and
 * piggyback on Stripe Connect. Saved payment methods + billing history +
 * downloadable invoices arrive in Phase 3 of the platform plan; the cards
 * are reserved here as placeholders so the IA contract is stable.
 */
export default function FinancesPage(): JSX.Element {
  const { t } = useTranslation();
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

  const isProvider =
    me.data.role === UserRole.Provider || me.data.role === UserRole.Both;

  return (
    <div className="space-y-6">
      <Card title={t('finances.currency.title')} hint={t('finances.currency.hint')}>
        <CurrencySection me={me.data} />
      </Card>

      <Card
        title={t('finances.paymentMethods.title')}
        hint={t('finances.paymentMethods.hint')}
      >
        <ComingSoonRow body={t('finances.paymentMethods.body')} />
      </Card>

      <Card
        title={t('finances.billingHistory.title')}
        hint={t('finances.billingHistory.hint')}
      >
        <ComingSoonRow body={t('finances.billingHistory.body')} />
      </Card>

      {isProvider ? (
        <Card title={t('profile.payouts')}>
          <StripeSection />
        </Card>
      ) : null}
    </div>
  );
}

function ComingSoonRow({ body }: { body: string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <p className="text-sm text-slate-600 dark:text-slate-300">{body}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {t('common.comingSoon')}
      </p>
    </div>
  );
}
