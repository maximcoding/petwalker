'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/profile/card';
import { SecuritySection } from '@/components/profile/security-section';
import { api } from '@/lib/api';


/**
 * Security tab.
 *
 * Auth is brokered by Cognito today, so the actual password / 2FA /
 * sessions controls are stubbed — see `SecuritySection` for the
 * placeholder rationale. The screen still ships now so the IA contract
 * is complete and links from the user menu have a real destination.
 */
export default function SecurityPage(): JSX.Element {
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

  return (
    <div className="space-y-6">
      <Card title={t('profile.security')} hint={t('security.hint')}>
        <SecuritySection me={me.data} />
      </Card>
    </div>
  );
}
