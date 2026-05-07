'use client';

import { ServiceType } from '@petwalker/shared/enums';
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
}

interface Props {
  initial: SearchValues;
  onSubmit: (v: SearchValues) => void;
  busy?: boolean;
}

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
    if (c) patch('lat', c.lat), patch('lng', c.lng);
    setGeoBusy(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Service</span>
        <select
          value={v.serviceType}
          onChange={(e) => patch('serviceType', e.target.value as ServiceType)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        >
          {ALL_SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {t(`services.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Latitude"
          type="number"
          step="0.0001"
          required
          value={v.lat}
          onChange={(e) => patch('lat', Number(e.target.value))}
        />
        <Field
          label="Longitude"
          type="number"
          step="0.0001"
          required
          value={v.lng}
          onChange={(e) => patch('lng', Number(e.target.value))}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={useDeviceLocation}
          disabled={geoBusy}
        >
          {geoBusy ? 'Locating…' : 'Use device location'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            patch('lat', SEED_LOCATION.lat);
            patch('lng', SEED_LOCATION.lng);
          }}
        >
          Use NYC (seed)
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Radius (km)"
          type="number"
          min="1"
          max="100"
          required
          value={v.radiusKm}
          onChange={(e) => patch('radiusKm', Number(e.target.value))}
        />
        <Field
          label="Max $/hour (optional)"
          type="number"
          min="0"
          value={v.maxHourlyCents ? v.maxHourlyCents / 100 : ''}
          onChange={(e) =>
            patch('maxHourlyCents', e.target.value ? Math.round(Number(e.target.value) * 100) : undefined)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Scheduled at (optional)"
          type="datetime-local"
          value={v.scheduledAt ?? ''}
          onChange={(e) => patch('scheduledAt', e.target.value || undefined)}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Duration (min, optional)</span>
          <select
            value={v.durationMin ?? ''}
            onChange={(e) =>
              patch('durationMin', e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">—</option>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? 'Searching…' : 'Search'}
      </Button>
    </form>
  );
}
