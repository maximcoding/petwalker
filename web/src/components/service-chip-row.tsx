'use client';

import type { ServiceType } from '@petwalker/shared/enums';
import { useTranslation } from 'react-i18next';

import { ALL_SERVICE_TYPES, ICONS } from '@/lib/service-icons';

interface Props {
  /** Currently selected service. */
  value: ServiceType;
  /** Called when the user picks a different chip. */
  onChange: (s: ServiceType) => void;
}

/**
 * Horizontally scrollable strip of service chips.
 *
 * Single-select for now — mirrors the backend search which takes one
 * serviceType. Multi-select would require a wider search API change.
 */
export function ServiceChipRow({ value, onChange }: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="-mx-6 overflow-x-auto px-6">
      <ul className="flex w-max gap-2 pb-1">
        {ALL_SERVICE_TYPES.map((s) => {
          const Icon = ICONS[s];
          const active = s === value;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onChange(s)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition',
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`services.${s}`)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
