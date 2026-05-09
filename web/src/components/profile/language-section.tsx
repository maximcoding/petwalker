'use client';

import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

/**
 * Language picker for the Preferences tab.
 *
 * The active language is owned by i18next; switching here updates the
 * runtime via `i18n.changeLanguage` and persists into localStorage at
 * key `petwalker.lang` (configured in i18n/index.ts) so a refresh keeps
 * the choice. Direction (RTL ↔ LTR) is wired through `applyDirection`
 * in `Providers` — switching to Hebrew flips `<html dir>` automatically.
 *
 * Mirrors `CurrencySection` shape so both Preferences cards read the
 * same on the page.
 */
export function LanguageSection(): JSX.Element {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en') as SupportedLanguage;

  function handleChange(next: string): void {
    if (next === current) return;
    void i18n.changeLanguage(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{t('language.hint')}</p>
      <label className="flex items-center gap-2 text-sm">
        <span className="font-medium">{t('common.language')}</span>
        <select
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={t('common.language')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {t(`lang.${lang}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
