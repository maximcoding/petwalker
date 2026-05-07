'use client';

import { UserRole } from '@petwalker/shared/enums';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AccountSection } from '@/components/profile/account-section';
import { AvailabilitySection } from '@/components/profile/availability-section';
import { OfferingsSection } from '@/components/profile/offerings-section';
import { RoleSection } from '@/components/profile/role-section';
import { ServiceProfileSection } from '@/components/profile/service-profile-section';
import { StripeSection } from '@/components/profile/stripe-section';
import { ScrollPage } from '@/components/scroll-page';
import { api } from '@/lib/api';

import type { User } from '@petwalker/shared/types';

function Card({ title, hint, children }: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

export default function ProfilePage(): JSX.Element {
  const { t } = useTranslation();
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  if (me.isLoading) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      </ScrollPage>
    );
  }
  if (me.error) {
    return (
      <ScrollPage>
        <p className="text-sm text-red-600">Error: {(me.error as Error).message}</p>
      </ScrollPage>
    );
  }
  if (!me.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Not signed in.</p>
      </ScrollPage>
    );
  }

  const isProvider = me.data.role === UserRole.Provider || me.data.role === UserRole.Both;

  return (
    <ScrollPage>
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('profile.subtitle')}</p>
        </header>

        <Card title={t('profile.account')}>
          <AccountSection me={me.data} />
        </Card>

        <Card title={t('profile.role')} hint={t('profile.switchRoleHint')}>
          <RoleSection me={me.data} />
        </Card>

        {isProvider ? (
          <>
            <Card title={t('profile.providerProfile')}>
              <ServiceProfileSection />
            </Card>

            <Card title={t('profile.offerings')}>
              <OfferingsSection />
            </Card>

            <Card title={t('profile.weeklyAvailability')}>
              <AvailabilitySection />
            </Card>

            <Card title={t('profile.payouts')}>
              <StripeSection />
            </Card>
          </>
        ) : (
          <Card title={t('profile.becomeProvider')}>
            <p className="text-sm text-slate-500">{t('profile.becomeProviderHint')}</p>
          </Card>
        )}
      </section>
    </ScrollPage>
  );
}
