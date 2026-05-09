'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AboutMeSection } from '@/components/profile/about-me-section';
import { AccountSection } from '@/components/profile/account-section';
import { Card } from '@/components/profile/card';
import { GoogleCalendarSection } from '@/components/profile/google-calendar-section';
import { RoleSection } from '@/components/profile/role-section';
import { ServiceProfileSection } from '@/components/profile/service-profile-section';
import { useViewMode } from '@/contexts/view-mode-context';
import { api } from '@/lib/api';


/**
 * Personal Info tab.
 *
 * Houses everything that defines the user as a person rather than a
 * provider or a payer:
 *  - About me (new) — free-form bio
 *  - Account — display name, phone, avatar, home address
 *  - Role — owner / provider / both selector with mode-toggle hint
 *
 * Provider-only sections (offerings, availability, etc.) live on
 * /profile/provider; payment-related rows live on /profile/finances.
 */
export default function PersonalPage(): JSX.Element {
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

  // Role drives which other cards render — putting it first makes the
  // conditional reveal feel intentional. Provider-only cards gate on
  // the active view mode (not raw role) so a `both` user toggling to
  // Owner mode in the UserMenu actually hides them; gating by role
  // would leave them visible regardless of the toggle.
  const isProviderView = mode === 'provider';

  return (
    <div className="space-y-6">
      <Card title={t('profile.role')} hint={t('profile.switchRoleHint')}>
        <RoleSection me={me.data} />
      </Card>

      <Card title={t('profile.aboutMe')} hint={t('aboutMe.hint')}>
        <AboutMeSection me={me.data} />
      </Card>

      <Card title={t('profile.account')}>
        <AccountSection me={me.data} />
      </Card>

      {isProviderView ? (
        <Card title={t('profile.providerProfile')} hint={t('profile.providerProfileHint')}>
          <ServiceProfileSection />
        </Card>
      ) : null}

      {isProviderView ? (
        <Card title={t('profile.calendar.title')} hint={t('profile.calendar.subtitle')}>
          <GoogleCalendarSection />
        </Card>
      ) : null}
    </div>
  );
}
