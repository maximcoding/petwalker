'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressField } from './address-field';
import { DateRangePicker } from './date-range-picker';
import { FreeSlotPicker } from './free-slot-picker';
import { Button } from './ui/button';

import type { ServiceType } from '@petwalker/shared/enums';
import type { Address, AddressSource, Pet, ServiceProviderDetail } from '@petwalker/shared/types';

const DURATION_PRESETS = [15, 30, 60, 120, 180, 1440, 2880, 4320, 10080] as const;

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 1440) {
    const h = min / 60;
    return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
  }
  const d = min / 1440;
  return Number.isInteger(d) ? `${d} day${d !== 1 ? 's' : ''}` : `${d.toFixed(1)} days`;
}

function nameInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

/* ── Tiny SVG icons ─────────────────────────────────────────────── */
function PawIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M6 3.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm-8 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm11 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM5.5 11c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4c0 .828-.672 1.5-1.5 1.5h-6A1.5 1.5 0 0 1 5.5 11Z" />
    </svg>
  );
}

function PinIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M9.69 18.933A10.06 10.06 0 0 1 10 19c0-.032.11-.066.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-12a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l2.828 2.829a1 1 0 1 0 1.415-1.415L11 9.586V6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TimerIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 2a.75.75 0 0 1 .75.75v.258a7.001 7.001 0 1 1-1.5 0V2.75A.75.75 0 0 1 10 2Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function NoteIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
    </svg>
  );
}

/* ── FormRow ────────────────────────────────────────────────────── */
function FormRow({
  label,
  icon,
  children,
  extra,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  extra?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-h-[56px] items-center gap-3 px-5">
        {icon ? (
          <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
        ) : null}
        <span className="w-24 shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {extra ? (
        <div className="overflow-hidden border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-800">
          {extra}
        </div>
      ) : null}
    </div>
  );
}

/* ── Sidebar card ───────────────────────────────────────────────── */
function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

/* ── Props ──────────────────────────────────────────────────────── */
interface Props {
  provider: ServiceProviderDetail;
  serviceType: string;
  pets: Pet[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: {
    petId: string;
    scheduledAts: string[];
    durationMin: number;
    notes: string | null;
    addressSource: AddressSource;
    customAddress?: Address;
    withAccommodation: boolean;
  }) => void;
}

function pickInitialSource(
  supports: { owner: boolean; provider: boolean; custom: boolean } | undefined,
): AddressSource {
  if (!supports || supports.owner) return 'owner_pet';
  if (supports.provider) return 'provider_offering';
  return 'custom';
}

/* ── BookingForm ────────────────────────────────────────────────── */
export function BookingForm({ provider, serviceType, pets, busy, error, onSubmit }: Props): JSX.Element {
  const { t } = useTranslation();
  const offering = useMemo(
    () => provider.offerings.find((o) => o.serviceType === serviceType),
    [provider, serviceType],
  );
  const serviceLabel = t(`services.${serviceType as ServiceType}`);

  const [petId, setPetId] = useState(pets[0]?.id ?? '');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const supports = offering?.supportedSources;
  const [addressSource, setAddressSource] = useState<AddressSource>(() => pickInitialSource(supports));
  const [customAddress, setCustomAddress] = useState<Address | null>(null);
  const [withAccommodation, setWithAccommodation] = useState(false);
  const [bookingMode, setBookingMode] = useState<'slots' | 'range'>('slots');
  const [dateRange, setDateRange] = useState<{ isoStart: string; durationMin: number } | null>(null);

  const isAtOwnerProperty = addressSource === 'owner_pet' || addressSource === 'owner_user';
  const effectiveDuration = bookingMode === 'range' && dateRange ? dateRange.durationMin : duration;
  const previewCents = offering ? Math.round(offering.hourlyRateCents * (effectiveDuration / 60)) : 0;
  const totalCents = bookingMode === 'slots' ? previewCents * Math.max(1, selectedSlots.size) : previewCents;

  const providerAddrText = offering?.serviceAddress?.text ?? t('booking.providerLocation');
  const selectedPet = pets.find((p) => p.id === petId);
  const petAddrText = selectedPet?.address?.text ?? '(Set a home address on this pet or your account)';

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (addressSource === 'custom' && (!customAddress || !customAddress.text.trim())) return;
    const base = {
      petId,
      notes: notes || null,
      addressSource,
      customAddress: addressSource === 'custom' ? customAddress ?? undefined : undefined,
      withAccommodation: isAtOwnerProperty && withAccommodation,
    };
    if (bookingMode === 'range') {
      if (!dateRange) return;
      onSubmit({ ...base, scheduledAts: [dateRange.isoStart], durationMin: dateRange.durationMin });
      return;
    }
    if (selectedSlots.size === 0) return;
    onSubmit({ ...base, scheduledAts: [...selectedSlots].sort(), durationMin: duration });
  }

  if (!offering) {
    return (
      <p className="text-sm text-red-600">
        This provider doesn&apos;t offer {serviceLabel} (anymore).
      </p>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p className="text-slate-600">You need a pet on file before booking.</p>
        <a href="/pets/new" className="mt-3 inline-block font-medium text-brand-600 hover:underline">
          Add a pet →
        </a>
      </div>
    );
  }

  /* ── Location ───────────────────────────────────────────────── */
  const locationEnabledCount = supports
    ? (supports.owner ? 1 : 0) + (supports.provider ? 1 : 0) + (supports.custom ? 1 : 0)
    : 0;

  const locationSummary =
    supports && locationEnabledCount === 1
      ? supports.owner
        ? `${t('booking.atPetHome')} · ${petAddrText}`
        : supports.provider
          ? `${t('booking.atProviderLocation')} · ${providerAddrText}`
          : t('booking.atOtherAddress')
      : addressSource === 'owner_pet'
        ? `${t('booking.atPetHome')} · ${petAddrText}`
        : addressSource === 'provider_offering'
          ? `${t('booking.atProviderLocation')} · ${providerAddrText}`
          : t('booking.atOtherAddress');

  const locationExtra =
    locationEnabledCount > 1 ? (
      <div className="space-y-2">
        {supports?.owner ? (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name="addr-source"
              checked={addressSource === 'owner_pet'}
              onChange={() => setAddressSource('owner_pet')}
            />
            <span className="font-medium">{t('booking.atPetHome')}</span>
            <span className="text-xs text-slate-500">{petAddrText}</span>
          </label>
        ) : null}
        {supports?.provider ? (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name="addr-source"
              checked={addressSource === 'provider_offering'}
              onChange={() => setAddressSource('provider_offering')}
            />
            <span className="font-medium">{t('booking.atProviderLocation')}</span>
            <span className="text-xs text-slate-500">{providerAddrText}</span>
          </label>
        ) : null}
        {supports?.custom ? (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name="addr-source"
              checked={addressSource === 'custom'}
              onChange={() => setAddressSource('custom')}
            />
            <span className="font-medium">{t('booking.atOtherAddress')}</span>
          </label>
        ) : null}
        {addressSource === 'custom' ? (
          <div className="mt-2">
            <AddressField
              value={customAddress}
              onChange={setCustomAddress}
              label=""
              hint={t('booking.customAddressHint')}
            />
          </div>
        ) : null}
      </div>
    ) : supports?.custom ? (
      <AddressField
        value={customAddress}
        onChange={setCustomAddress}
        label=""
        hint={t('booking.customAddressHint')}
      />
    ) : null;

  /* ── When ───────────────────────────────────────────────────── */
  const modeToggle = (
    <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      {(['slots', 'range'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => {
            setBookingMode(mode);
            setSelectedSlots(new Set());
            setDateRange(null);
          }}
          className={[
            'rounded-md px-3 py-1 text-xs font-medium transition',
            bookingMode === mode
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          ].join(' ')}
        >
          {mode === 'slots' ? 'Specific times' : 'Date range'}
        </button>
      ))}
    </div>
  );

  const whenExtra =
    bookingMode === 'range' ? (
      <DateRangePicker
        value={dateRange}
        onChange={(isoStart, durationMin) => setDateRange({ isoStart, durationMin })}
        onClear={() => setDateRange(null)}
      />
    ) : (
      <>
        <div className="flex h-[680px] flex-col">
          <FreeSlotPicker
            providerId={provider.userId}
            serviceType={serviceType as ServiceType}
            durationMin={duration}
            value={selectedSlots}
            onChange={(start) =>
              setSelectedSlots((prev) => {
                const next = new Set(prev);
                if (next.has(start)) next.delete(start);
                else next.add(start);
                return next;
              })
            }
            onClear={() => setSelectedSlots(new Set())}
          />
        </div>
        {selectedSlots.size === 0 ? (
          <p className="mt-2 text-xs text-slate-400">Select at least one time slot to continue.</p>
        ) : null}
      </>
    );

  /* ── Duration ───────────────────────────────────────────────── */
  const durationExtra = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={duration === d}
            onClick={() => {
              setDuration(d);
              setSelectedSlots(new Set());
            }}
            className={[
              'rounded-full border px-3 py-1 text-sm transition',
              duration === d
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300',
            ].join(' ')}
          >
            {fmtDuration(d)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={20160}
          value={duration}
          onChange={(e) => {
            const v = Math.max(1, Math.min(20160, Number(e.target.value) || 1));
            setDuration(v);
            setSelectedSlots(new Set());
          }}
          className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900"
        />
        <span className="text-sm text-slate-500">
          min{duration >= 60 ? ` = ${fmtDuration(duration)}` : ''}
        </span>
      </div>
    </div>
  );

  /* ── Booking summary ────────────────────────────────────────── */
  const selectedSlotsSorted = [...selectedSlots].sort();
  const firstSlotDate = selectedSlotsSorted[0]
    ? new Date(selectedSlotsSorted[0]).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const rangeDateStr = dateRange
    ? new Date(dateRange.isoStart).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">

        {/* ── LEFT: form rows ────────────────────────────────── */}
        <div className="space-y-3">

          {/* Pet */}
          <FormRow label="Pet" icon={<PawIcon />}>
            <select
              required
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 focus:outline-none dark:text-slate-100"
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.breed ? ` · ${p.breed}` : ''}
                </option>
              ))}
            </select>
          </FormRow>

          {/* Location */}
          {locationEnabledCount > 0 ? (
            <FormRow label="Location" icon={<PinIcon />} extra={locationExtra}>
              <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                {locationSummary}
              </span>
            </FormRow>
          ) : null}

          {/* When */}
          <FormRow label="When" icon={<ClockIcon />} extra={whenExtra}>
            {modeToggle}
          </FormRow>

          {/* Duration — slots mode only */}
          {bookingMode === 'slots' ? (
            <FormRow label="Duration" icon={<TimerIcon />} extra={durationExtra}>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {fmtDuration(duration)}
              </span>
            </FormRow>
          ) : null}

          {/* Accommodation — date range + owner's property only */}
          {bookingMode === 'range' && isAtOwnerProperty ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={withAccommodation}
                  onChange={(e) => setWithAccommodation(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-medium">Accommodation included</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    The provider will stay at my property for the duration.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {/* Notes */}
          <FormRow label="Notes" icon={<NoteIcon />} extra={
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={`Anything ${provider.fullName.split(' ')[0] ?? provider.fullName} should know (optional)`}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            />
          }>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {notes ? notes.slice(0, 40) + (notes.length > 40 ? '…' : '') : 'Add notes (optional)'}
            </span>
          </FormRow>

        </div>

        {/* ── RIGHT: sticky sidebar ───────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-5rem)] lg:flex-col">
          <div className="space-y-4 overflow-y-auto pr-1 lg:flex-1">

            {/* Provider card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col items-center text-center">
                {provider.avatarUrl ? (
                  <img
                    src={provider.avatarUrl}
                    alt={provider.fullName}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                    {nameInitials(provider.fullName)}
                  </div>
                )}
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                  {provider.fullName}
                </p>
                {provider.rating != null ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    ★ {provider.rating.toFixed(1)}
                    {provider.reviewCount > 0 ? ` (${provider.reviewCount} reviews)` : ''}
                  </p>
                ) : null}
                <span className="mt-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {serviceLabel}
                </span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-center text-sm text-slate-500 dark:border-slate-800">
                ${(offering.hourlyRateCents / 100).toFixed(2)} / hour
              </p>
            </div>

            {/* Booking summary */}
            <SidebarCard title="Booking Summary">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Service</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">{serviceLabel}</dd>
                </div>
                {(firstSlotDate ?? rangeDateStr) ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {firstSlotDate ?? rangeDateStr}
                      {selectedSlotsSorted.length > 1 ? ` +${selectedSlotsSorted.length - 1}` : ''}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {fmtDuration(effectiveDuration)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                  <dt className="font-semibold text-slate-700 dark:text-slate-200">Total</dt>
                  <dd className="text-lg font-bold text-brand-700 dark:text-brand-300">
                    ${(totalCents / 100).toFixed(2)}
                  </dd>
                </div>
              </dl>
            </SidebarCard>

          </div>
        </div>

      </div>

      {/* Confirm bar */}
      <div className="mt-8 border-t border-slate-200 py-6 dark:border-slate-800">
        <div className="mx-auto flex max-w-md items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-500">
              {serviceLabel} · {fmtDuration(effectiveDuration)}
            </p>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              ${(totalCents / 100).toFixed(2)}
              {bookingMode === 'slots' && selectedSlots.size > 1 ? (
                <span className="ml-1 text-xs font-normal text-slate-400">
                  ({selectedSlots.size} × ${(previewCents / 100).toFixed(2)})
                </span>
              ) : null}
            </p>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
          <Button
            type="submit"
            className="shrink-0"
            disabled={busy || (bookingMode === 'range' ? !dateRange : selectedSlots.size === 0)}
          >
            {busy
              ? 'Booking…'
              : bookingMode === 'slots' && selectedSlots.size > 1
                ? `Confirm ${selectedSlots.size}`
                : 'Confirm booking'}
          </Button>
        </div>
      </div>
    </form>
  );
}
