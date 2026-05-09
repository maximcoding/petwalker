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
 * Visual treatment:
 *  - Native scrollbar hidden (Firefox + WebKit) — the row is meant to
 *    feel like a Stories tray, not a scrollable container.
 *  - Soft gradient masks fade chips into the right/left edges so users
 *    intuit there's more without seeing a hard cut-off.
 *  - Active chip uses a filled brand pill; inactive chips have no
 *    border so the whole row reads as one tray instead of nine boxes.
 */
export function ServiceChipRow({ value, onChange }: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="-mx-1 px-1"
      style={{
        // Fade the last ~32px on each side so the strip clearly continues
        // off-screen but the inner chips render at full opacity.
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <ul
        className="flex w-max gap-2 overflow-x-auto scroll-smooth py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(`services.${s}`)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
