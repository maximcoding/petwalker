'use client';

import {
  BookingMode,
  DEFAULT_BOOKING_MODE,
  DEFAULT_SLOT_DURATION_MIN,
  DEFAULT_SUPPORTED_SOURCES,
  ServiceType,
} from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AddressField } from '@/components/address-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';
import { ALL_SERVICE_TYPES, ICONS } from '@/lib/service-icons';

import type { UpsertServiceOfferingDto } from '@petwalker/shared/dto';
import type {
  Address,
  ServiceOffering,
  SupportedAddressSources,
} from '@petwalker/shared/types';

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
  const [bookingMode, setBookingMode] = useState<BookingMode>(
    offering?.bookingMode ?? DEFAULT_BOOKING_MODE[serviceType],
  );
  const [slotDuration, setSlotDuration] = useState<number>(
    offering?.slotDurationMin ?? DEFAULT_SLOT_DURATION_MIN[serviceType],
  );
  const [supports, setSupports] = useState<SupportedAddressSources>(
    offering?.supportedSources ?? DEFAULT_SUPPORTED_SOURCES[serviceType],
  );
  const [serviceAddress, setServiceAddress] = useState<Address | null>(
    offering?.serviceAddress ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  function patchSupports(key: keyof SupportedAddressSources, value: boolean): void {
    setSupports((prev) => {
      const next = { ...prev, [key]: value };
      // Block unticking the last enabled checkbox — the DB CHECK constraint
      // rejects the row anyway, but failing fast in the UI is friendlier.
      if (!next.owner && !next.provider && !next.custom) return prev;
      return next;
    });
  }

  const upsert = useMutation({
    mutationFn: (body: UpsertServiceOfferingDto) => api.users.upsertOffering(body),
    onSuccess: () => {
      setError(null);
      toast.success(t('toasts.saved'));
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

  const publish = useMutation({
    mutationFn: () => api.users.publishSlots(serviceType),
    onSuccess: (res) => {
      toast.success(t('profile.slotsPublished', { count: res.inserted }));
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const cents = Math.round(Number(hourly) * 100);
  const valid = !Number.isNaN(cents) && cents >= 0;

  return (
    <li className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[160px_1fr_auto_auto]">
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
            {t('profile.offeringActive')}
          </label>
        </label>

        <Button
          type="button"
          variant="secondary"
          disabled={!valid || upsert.isPending}
          onClick={() =>
            upsert.mutate({
              serviceType,
              hourlyRateCents: cents,
              active,
              bookingMode,
              slotDurationMin: slotDuration,
              supportedSources: supports,
              serviceAddress,
            })
          }
        >
          {upsert.isPending ? <Spinner size="sm" /> : offering ? t('common.save') : t('common.add')}
        </Button>

        {offering ? (
          <Button
            type="button"
            variant="danger"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? '…' : t('common.remove')}
          </Button>
        ) : (
          <span />
        )}
      </div>

      {/* Booking mode + slot duration row. Slot duration is only meaningful in
          slot mode; we keep it visible-but-disabled in window mode so the
          provider can configure it before flipping the mode. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <label className="inline-flex items-center gap-2">
          <span className="text-slate-500">{t('profile.bookingMode')}:</span>
          <select
            value={bookingMode}
            onChange={(e) => setBookingMode(e.target.value as BookingMode)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value={BookingMode.Window}>{t('profile.modeWindow')}</option>
            <option value={BookingMode.Slot}>{t('profile.modeSlot')}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-slate-500">{t('profile.slotDuration')}:</span>
          <input
            type="number"
            min={15}
            max={1440}
            step={15}
            value={slotDuration}
            onChange={(e) => setSlotDuration(Math.max(15, Number(e.target.value) || 15))}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-slate-500">{t('profile.minutes')}</span>
        </label>
        {offering && offering.bookingMode === 'slot' ? (
          <Button
            type="button"
            variant="secondary"
            disabled={publish.isPending}
            onClick={() => publish.mutate()}
            className="!px-3 !py-1 !text-xs"
          >
            {publish.isPending ? <Spinner size="sm" /> : t('profile.publishSlots')}
          </Button>
        ) : null}
      </div>

      {/* Service-location subsection. Provider opts in to which location
          families they support — owner picks at booking time within this
          set. At least one must be checked (UI blocks the last untick;
          DB also enforces via CHECK constraint). */}
      <div className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <p className="text-slate-500">{t('profile.supportedSources')}:</p>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={supports.owner}
              onChange={(e) => patchSupports('owner', e.target.checked)}
            />
            {t('profile.supportsOwner')}
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={supports.provider}
              onChange={(e) => patchSupports('provider', e.target.checked)}
            />
            {t('profile.supportsProvider')}
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={supports.custom}
              onChange={(e) => patchSupports('custom', e.target.checked)}
            />
            {t('profile.supportsCustom')}
          </label>
        </div>
        <AddressField
          value={serviceAddress}
          onChange={setServiceAddress}
          label={t('profile.serviceAddress')}
          hint={t('profile.serviceAddressHint')}
        />
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </li>
  );
}

export function OfferingsSection(): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const q = useQuery<ServiceOffering[]>({
    queryKey: ['offerings'],
    queryFn: () => api.users.listMyOfferings(),
  });

  const byType = new Map<ServiceType, ServiceOffering>();
  (q.data ?? []).forEach((o) => byType.set(o.serviceType, o));

  if (q.isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
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
