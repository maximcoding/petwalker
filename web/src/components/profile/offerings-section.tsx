'use client';

import {
  BookingMode,
  DEFAULT_BOOKING_MODE,
  DEFAULT_SLOT_DURATION_MIN,
  DEFAULT_SUPPORTED_SOURCES,
  ServiceType,
} from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
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
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}

function OfferingRow({
  serviceType,
  offering,
  expanded,
  onToggle,
  onSaved,
}: RowProps): JSX.Element {
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

  function patchSupports(key: keyof SupportedAddressSources, value: boolean): void {
    setSupports((prev) => {
      const next = { ...prev, [key]: value };
      // Block unticking the last enabled checkbox — DB CHECK rejects this
      // anyway, but failing fast in the UI is friendlier.
      if (!next.owner && !next.provider && !next.custom) return prev;
      return next;
    });
  }
  const [error, setError] = useState<string | null>(null);

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

  // Collapsed summary row (always visible). The full editor is rendered
  // below only when `expanded` is true — keeps the page scannable when
  // a provider has many active services.
  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
      >
        <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
        <span className="flex-1 font-medium">{t(`services.${serviceType}`)}</span>
        {offering ? (
          <>
            <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
              ${(offering.hourlyRateCents / 100).toFixed(2)}/h
            </span>
            <span
              className={
                offering.active
                  ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }
            >
              {offering.active ? t('profile.offeringActive') : t('common.remove')}
            </span>
          </>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {t('common.add')}
          </span>
        )}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {!expanded ? null : (
      <div className="space-y-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_auto]">
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
              // Pass the address through; null clears, object overwrites.
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
      </div>
      )}
    </li>
  );
}

export function OfferingsSection(): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();
  // Single-expanded accordion: at most one row open at a time. `null`
  // collapses everything, which is the default state — providers see a
  // scannable list rather than 11 expanded forms.
  const [expanded, setExpanded] = useState<ServiceType | null>(null);
  // Tracks which unconfigured service the user just picked from the
  // searchable Add-a-service picker. We render exactly that one extra
  // row inline (auto-expanded) so they can fill out the form right
  // there. Once saved, the offering exists and the row migrates to the
  // `configured` list naturally on the next render.
  const [picking, setPicking] = useState<ServiceType | null>(null);

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

  // Configured services first; the picked-but-not-yet-saved one (if
  // any) renders as an extra row at the bottom in expand-state.
  const configured = ALL_SERVICE_TYPES.filter((s) => byType.has(s));
  const unconfigured = ALL_SERVICE_TYPES.filter((s) => !byType.has(s));
  const pickerOptions = unconfigured.filter((s) => s !== picking);

  function handleToggle(s: ServiceType): void {
    setExpanded((prev) => (prev === s ? null : s));
  }

  function handlePick(s: ServiceType): void {
    setPicking(s);
    setExpanded(s);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {configured.map((s) => (
          <OfferingRow
            key={s}
            serviceType={s}
            offering={byType.get(s)}
            expanded={expanded === s}
            onToggle={() => handleToggle(s)}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ['offerings'] });
            }}
          />
        ))}
        {picking ? (
          <OfferingRow
            key={picking}
            serviceType={picking}
            offering={undefined}
            expanded={expanded === picking}
            onToggle={() => handleToggle(picking!)}
            onSaved={() => {
              setPicking(null);
              void qc.invalidateQueries({ queryKey: ['offerings'] });
            }}
          />
        ) : null}
      </ul>

      {pickerOptions.length > 0 ? (
        <AddServicePicker options={pickerOptions} onPick={handlePick} />
      ) : null}
    </div>
  );
}

interface AddServicePickerProps {
  options: ServiceType[];
  onPick: (s: ServiceType) => void;
}

/**
 * "+ Add a service" → click opens a small inline popover with a search
 * input and the filtered list of unconfigured services. Picking one
 * closes the popover and triggers the parent to render that service's
 * row in expanded state.
 *
 * Inline (not a portal modal) so the focus + scroll stay anchored to
 * the Services card. Click-outside collapses the popover.
 */
function AddServicePicker({ options, onPick }: AddServicePickerProps): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter((s) => {
    const label = t(`services.${s}`).toLowerCase();
    return label.includes(query.toLowerCase());
  });

  return (
    <div ref={ref} className="relative">
      {open ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('profile.addServicePlaceholder')}
            className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">{t('profile.addServiceEmpty')}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {filtered.map((s) => {
                const Icon = ICONS[s];
                return (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(s);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <Icon className="h-5 w-5 text-slate-500" aria-hidden />
                      <span className="font-medium">{t(`services.${s}`)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-2 flex justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)}>{t('profile.addService')}</Button>
      )}
    </div>
  );
}
