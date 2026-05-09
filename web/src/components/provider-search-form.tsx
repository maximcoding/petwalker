'use client';

import type { ServiceType } from '@petwalker/shared/enums';
import { ChevronDown, Locate, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { getBrowserLocation, SEED_LOCATION } from '@/lib/geolocation';
import { ALL_SERVICE_TYPES } from '@/lib/service-icons';

export interface SearchValues {
  serviceType: ServiceType;
  lat: number;
  lng: number;
  radiusKm: number;
  scheduledAt?: string;
  durationMin?: number;
  minRating?: number;
  maxHourlyCents?: number;
  /** Free-text search across name + bio. Mirrors the URL `?q=` param. */
  q?: string;
}

interface Props {
  initial: SearchValues;
  onSubmit: (v: SearchValues) => void;
  busy?: boolean;
}

/**
 * Advanced filter panel — sits below the page-level search & service
 * chips. Layout is grouped by intent (where, then how far / how much,
 * then when) so the user reads down a sensible funnel rather than
 * across a flat form.
 *
 * No outer card wrapper here — the page renders this inline once the
 * "Refine" toggle is open. The page already owns the section spacing.
 *
 * The free-text `q` field is intentionally not duplicated here: it
 * lives in the page header so it's always visible. The form still
 * carries the value through so submitting preserves it.
 */
export function ProviderSearchForm({ initial, onSubmit, busy }: Props): JSX.Element {
  const [v, setV] = useState<SearchValues>(initial);
  const [geoBusy, setGeoBusy] = useState(false);
  const { t } = useTranslation();

  useEffect(() => setV(initial), [initial]);

  function patch<K extends keyof SearchValues>(k: K, val: SearchValues[K]): void {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function useDeviceLocation(): Promise<void> {
    setGeoBusy(true);
    const c = await getBrowserLocation();
    if (c) {
      // Patch both at once so we don't trigger two re-renders.
      setV((p) => ({ ...p, lat: c.lat, lng: c.lng }));
    }
    setGeoBusy(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-5"
    >
      {/* Service */}
      <FormGroup label={t('providers.form.service')}>
        <SelectShell>
          <select
            value={v.serviceType}
            onChange={(e) => patch('serviceType', e.target.value as ServiceType)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/40"
          >
            {ALL_SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {t(`services.${s}`)}
              </option>
            ))}
          </select>
        </SelectShell>
      </FormGroup>

      {/* Location */}
      <FormGroup
        label={t('providers.form.location')}
        hint={t('providers.form.locationHint')}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={useDeviceLocation}
            disabled={geoBusy}
          >
            <Locate className="mr-1.5 h-4 w-4" aria-hidden />
            {geoBusy ? t('providers.form.locating') : t('providers.form.useDevice')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setV((p) => ({ ...p, lat: SEED_LOCATION.lat, lng: SEED_LOCATION.lng }));
            }}
          >
            <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
            {t('providers.form.useSeed')}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label={t('providers.form.lat')}
            type="number"
            step="0.0001"
            required
            value={v.lat}
            onChange={(e) => patch('lat', Number(e.target.value))}
          />
          <Field
            label={t('providers.form.lng')}
            type="number"
            step="0.0001"
            required
            value={v.lng}
            onChange={(e) => patch('lng', Number(e.target.value))}
          />
        </div>
      </FormGroup>

      {/* Distance & price */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={t('providers.form.radius')}
          type="number"
          min="1"
          max="100"
          required
          value={v.radiusKm}
          onChange={(e) => patch('radiusKm', Number(e.target.value))}
        />
        <Field
          label={t('providers.form.maxPrice')}
          type="number"
          min="0"
          placeholder="—"
          value={v.maxHourlyCents ? v.maxHourlyCents / 100 : ''}
          onChange={(e) =>
            patch(
              'maxHourlyCents',
              e.target.value ? Math.round(Number(e.target.value) * 100) : undefined,
            )
          }
        />
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={t('providers.form.scheduledAt')}
          type="datetime-local"
          value={v.scheduledAt ?? ''}
          onChange={(e) => patch('scheduledAt', e.target.value || undefined)}
        />
        <FormGroup label={t('providers.form.duration')}>
          <SelectShell>
            <select
              value={v.durationMin ?? ''}
              onChange={(e) =>
                patch('durationMin', e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/40"
            >
              <option value="">—</option>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} {t('providers.form.minutes')}
                </option>
              ))}
            </select>
          </SelectShell>
        </FormGroup>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="submit" disabled={busy}>
          {busy ? t('providers.form.searching') : t('providers.form.apply')}
        </Button>
      </div>
    </form>
  );
}

interface FormGroupProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function FormGroup({ label, hint, children }: FormGroupProps): JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** Native <select> wrapper with a chevron overlay. */
function SelectShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  );
}
