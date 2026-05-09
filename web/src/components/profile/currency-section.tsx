'use client';

import { SUPPORTED_CURRENCIES } from '@petwalker/shared/types';
import type { SupportedCurrency, User } from '@petwalker/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';


interface Props {
  me: User;
}

/**
 * Lets the user pick the currency used for price displays and invoices.
 *
 * Save semantics: the underlying field accepts `null` (clears the
 * preference, UI falls back to USD). This component never sends `null`
 * because the dropdown always has a concrete value selected — clearing
 * the preference is a design decision deferred until we've seen real
 * usage. If we want it later, add a "System default (USD)" option that
 * maps to `preferredCurrency: null`.
 */
export function CurrencySection({ me }: Props): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const value: SupportedCurrency = me.preferredCurrency ?? 'USD';

  const save = useMutation({
    mutationFn: (next: SupportedCurrency) =>
      api.users.updateMe({ preferredCurrency: next }),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated);
      void qc.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('common.saved'));
    },
    onError: (e: Error) => {
      toast.error(prettifyError(t, e));
    },
  });

  function handleChange(next: string): void {
    if (next === value) return;
    if ((SUPPORTED_CURRENCIES as readonly string[]).includes(next)) {
      save.mutate(next as SupportedCurrency);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{t('currency.hint')}</p>
      <label className="flex items-center gap-2 text-sm">
        <span className="font-medium">{t('currency.label')}</span>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={save.isPending}
          aria-label={t('currency.label')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {t(`currency.codes.${code}`)}
            </option>
          ))}
        </select>
        {save.isPending ? (
          <span className="text-xs text-slate-500">{t('common.saving')}</span>
        ) : null}
      </label>
    </div>
  );
}
