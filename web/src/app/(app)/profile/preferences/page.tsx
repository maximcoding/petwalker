'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/profile/card';
import { CurrencySection } from '@/components/profile/currency-section';
import { LanguageSection } from '@/components/profile/language-section';
import { api } from '@/lib/api';


/**
 * Preferences tab — display preferences that don't fit Personal/Security/
 * Provider/Finances:
 *
 *  - Language — drives i18next + RTL flip; persisted to localStorage by
 *    i18next's language detector.
 *  - Currency — `User.preferredCurrency`; persisted via the API.
 *
 * The previous home for Currency was the Finances tab and Language was a
 * navbar quick-switcher; both moved here so the IA reads cleanly: money
 * concerns stay on Finances, display preferences stay together.
 */
export default function PreferencesPage(): JSX.Element {
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
      <Card title={t('preferences.language.title')} hint={t('preferences.language.hint')}>
        <LanguageSection />
      </Card>

      <Card title={t('preferences.currency.title')} hint={t('preferences.currency.hint')}>
        <CurrencySection me={me.data} />
      </Card>
    </div>
  );
}
