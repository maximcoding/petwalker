'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { SecuritySection } from '@/components/profile/security-section';
import { api } from '@/lib/api';


/**
 * Security tab.
 *
 * Single-section page — the tab itself is "Account & security", so we
 * render the section directly instead of wrapping it in a Card with the
 * same title (which would say "Account & security" twice).
 *
 * Auth is brokered by Cognito today, so password / 2FA / sessions are
 * stubbed; see `SecuritySection` for the placeholder rationale. The
 * subhead lives here so the user still gets context without the
 * duplicated H2.
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
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t('security.hint')}</p>
      <SecuritySection me={me.data} />
    </div>
  );
}
