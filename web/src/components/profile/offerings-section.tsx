'use client';

import { ServiceType } from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ALL_SERVICE_TYPES, ICONS } from '@/lib/service-icons';

import type { UpsertServiceOfferingDto } from '@petwalker/shared/dto';
import type { ServiceOffering } from '@petwalker/shared/types';

interface RowProps {
  serviceType: ServiceType;
  offering: ServiceOffering | undefined;
  onSaved: () => void;
}

function OfferingRow({ serviceType, offering, onSaved }: RowProps): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const Icon = ICONS[serviceType];
  const [hourly, setHourly] = useState<string>(
    offering ? (offering.hourlyRateCents / 100).toFixed(2) : '',
  );
  const [active, setActive] = useState<boolean>(offering?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: (body: UpsertServiceOfferingDto) => api.users.upsertOffering(body),
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.users.removeOffering(serviceType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });

  const cents = Math.round(Number(hourly) * 100);
  const valid = !Number.isNaN(cents) && cents >= 0;

  return (
    <li className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[160px_1fr_auto_auto] dark:border-slate-800">
      <span className="flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {t(`services.${serviceType}`)}
      </span>

      <label className="flex items-center gap-2 text-sm">
        <span className="w-10 text-slate-500">$/h</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={hourly}
          onChange={(e) => setHourly(e.target.value)}
          className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
          placeholder="25.00"
        />
        <label className="ml-3 inline-flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          active
        </label>
      </label>

      <Button
        type="button"
        variant="secondary"
        disabled={!valid || upsert.isPending}
        onClick={() => upsert.mutate({ serviceType, hourlyRateCents: cents, active })}
      >
        {offering ? (upsert.isPending ? 'Saving…' : 'Save') : 'Add'}
      </Button>

      {offering ? (
        <Button
          type="button"
          variant="danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {remove.isPending ? '…' : 'Remove'}
        </Button>
      ) : (
        <span />
      )}

      {error ? (
        <p className="col-span-full text-xs text-red-600">{error}</p>
      ) : null}
    </li>
  );
}

export function OfferingsSection(): JSX.Element {
  const qc = useQueryClient();

  const q = useQuery<ServiceOffering[]>({
    queryKey: ['offerings'],
    queryFn: () => api.users.listMyOfferings(),
  });

  const byType = new Map<ServiceType, ServiceOffering>();
  (q.data ?? []).forEach((o) => byType.set(o.serviceType, o));

  if (q.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (q.error) {
    return <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>;
  }

  return (
    <ul className="space-y-2">
      {ALL_SERVICE_TYPES.map((s) => (
        <OfferingRow
          key={s}
          serviceType={s}
          offering={byType.get(s)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['offerings'] });
          }}
        />
      ))}
    </ul>
  );
}
