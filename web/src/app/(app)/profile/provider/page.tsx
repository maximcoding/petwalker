'use client';

import { UserRole } from '@petwalker/shared/enums';
import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AvailabilitySection } from '@/components/profile/availability-section';
import { BlackoutsSection } from '@/components/profile/blackouts-section';
import { CalendarFeedSection } from '@/components/profile/calendar-feed-section';
import { Card } from '@/components/profile/card';
import { OfferingsSection } from '@/components/profile/offerings-section';
import { ServiceProfileSection } from '@/components/profile/service-profile-section';
import { api } from '@/lib/api';


/**
 * Provider Tools tab.
 *
 * Aggregates everything a provider configures to take bookings:
 *  - Service profile (bio, base location, radius)
 *  - Offerings (per-service price, duration, mode, supported sources)
 *  - Weekly availability + unavailability windows
 *  - External calendar (iCal busy-time import)
 *
 * Stripe payouts moved to /profile/finances since payouts are a money
 * concern, not a service-config concern.
 *
 * If a pure-Owner user lands here (e.g. via a stale link), bounce them
 * back to /profile/personal — the tab itself is hidden in the layout
 * for non-providers.
 */
export default function ProviderPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  const isProvider =
    me.data?.role === UserRole.Provider || me.data?.role === UserRole.Both;

  useEffect(() => {
    if (me.data && !isProvider) {
      router.replace('/profile/personal');
    }
  }, [me.data, isProvider, router]);

  if (me.isLoading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }
  if (me.error) {
    return <p className="text-sm text-red-600">Error: {(me.error as Error).message}</p>;
  }
  if (!me.data || !isProvider) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <Card title={t('profile.providerProfile')}>
        <ServiceProfileSection />
      </Card>

      <Card title={t('profile.offerings')}>
        <OfferingsSection />
      </Card>

      <Card title={t('profile.weeklyAvailability')}>
        <AvailabilitySection />
      </Card>

      <Card title={t('profile.unavailability.title')} hint={t('profile.unavailability.hint')}>
        <BlackoutsSection />
      </Card>

      <Card title={t('profile.calendar.title')} hint={t('profile.calendar.subtitle')}>
        <CalendarFeedSection />
      </Card>
    </div>
  );
}
