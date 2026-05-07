'use client';

import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

export function LangSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en') as SupportedLanguage;

  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      <span className="hidden sm:inline">{t('common.language')}</span>
      <select
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
        aria-label={t('common.language')}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {t(`lang.${lang}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
