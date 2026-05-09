'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressField } from './address-field';
import { DateRangePicker } from './date-range-picker';
import { FreeSlotPicker } from './free-slot-picker';
import { Button } from './ui/button';
import { TextareaField } from './ui/field';

import type { ServiceType } from '@petwalker/shared/enums';
import type {
  Address,
  AddressSource,
  Pet,
  ServiceProviderDetail,
} from '@petwalker/shared/types';

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

interface Props {
  provider: ServiceProviderDetail;
  serviceType: string;
  pets: Pet[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: {
    petId: string;
    scheduledAts: string[]; // ISO UTC — one per selected slot
    durationMin: number;
    notes: string | null;
    addressSource: AddressSource;
    customAddress?: Address;
    withAccommodation: boolean;
  }) => void;
}

/**
 * Initial address source — first family the provider opted in to, picking
 * the most-specific concrete source within that family. The DB CHECK
 * constraint guarantees at least one is true; the empty case is defensive.
 */
function pickInitialSource(
  supports: { owner: boolean; provider: boolean; custom: boolean } | undefined,
): AddressSource {
  if (!supports || supports.owner) return 'owner_pet';
  if (supports.provider) return 'provider_offering';
  return 'custom';
}

export function BookingForm({
  provider,
  serviceType,
  pets,
  busy,
  error,
  onSubmit,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const offering = useMemo(
    () => provider.offerings.find((o) => o.serviceType === serviceType),
    [provider, serviceType],
  );
  const serviceLabel = t(`services.${serviceType as ServiceType}`);
  const [petId, setPetId] = useState(pets[0]?.id ?? '');
  /** Set of ISO starts chosen via FreeSlotPicker. */
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const supports = offering?.supportedSources;
  const [addressSource, setAddressSource] = useState<AddressSource>(() =>
    pickInitialSource(supports),
  );
  const [customAddress, setCustomAddress] = useState<Address | null>(null);
  const [withAccommodation, setWithAccommodation] = useState(false);
  /** User-chosen booking mode. */
  const [bookingMode, setBookingMode] = useState<'slots' | 'range'>('slots');
  /** Date-range selection: start ISO + duration derived from end date. */
  const [dateRange, setDateRange] = useState<{ isoStart: string; durationMin: number } | null>(null);

  const isAtOwnerProperty =
    addressSource === 'owner_pet' || addressSource === 'owner_user';

  const effectiveDuration = bookingMode === 'range' && dateRange ? dateRange.durationMin : duration;
  const previewCents = offering ? Math.round(offering.hourlyRateCents * (effectiveDuration / 60)) : 0;

  // Provider's resolved address for the radio label — the offering override
  // wins, falling back to the provider's user.address. We pull the latter
  // out of ServiceProviderDetail's bio/location later if needed; for v1
  // the offering address is the only thing in the type, so a missing one
  // falls back to a generic "Provider's location" label.
  const providerAddrText =
    offering?.serviceAddress?.text ?? t('booking.providerLocation');
  const selectedPet = pets.find((p) => p.id === petId);
  const petAddrText = selectedPet?.address?.text ?? t('booking.ownerHome');

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
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <p className="text-sm text-slate-600">You need a pet on file before booking.</p>
        <a href="/pets/new" className="mt-2 inline-block font-medium text-brand-600 hover:underline">
          Add a pet →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      {/* Body: single column on mobile, two columns on md+ */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-8">
      {/* Left column — static fields (Pet, Duration, Where) */}
      <div className="shrink-0 space-y-4 py-4 md:w-72 md:overflow-y-auto">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Pet</span>
          <select
            required
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.breed ? `· ${p.breed}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium">Duration</span>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={duration === d}
                onClick={() => { setDuration(d); setSelectedSlots(new Set()); setDateStart(null); }}
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
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20160}
              value={duration}
              onChange={(e) => {
                const v = Math.max(1, Math.min(20160, Number(e.target.value) || 1));
                setDuration(v);
                setSelectedSlots(new Set());
                setDateStart(null);
              }}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <span className="text-sm text-slate-500">
              min{duration >= 60 ? ` = ${fmtDuration(duration)}` : ''}
            </span>
          </div>
        </div>

        {/* Where */}
        {supports ? (() => {
          const enabledCount =
            (supports.owner ? 1 : 0) + (supports.provider ? 1 : 0) + (supports.custom ? 1 : 0);
          if (enabledCount === 0) return null;
          if (enabledCount === 1) {
            const label = supports.owner
              ? `${t('booking.atPetHome')} · ${petAddrText}`
              : supports.provider
                ? `${t('booking.atProviderLocation')} · ${providerAddrText}`
                : t('booking.atOtherAddress');
            return (
              <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span className="block font-medium">{t('booking.whereLabel')}</span>
                <span className="mt-1 block text-slate-600 dark:text-slate-300">{label}</span>
                {supports.custom ? (
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
            );
          }
          return (
            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <legend className="px-1 text-sm font-medium">{t('booking.whereLabel')}</legend>
              {supports.owner ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="addr-source"
                    checked={addressSource === 'owner_pet'}
                    onChange={() => setAddressSource('owner_pet')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block">{t('booking.atPetHome')}</span>
                    <span className="block text-xs text-slate-500">{petAddrText}</span>
                  </span>
                </label>
              ) : null}
              {supports.provider ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="addr-source"
                    checked={addressSource === 'provider_offering'}
                    onChange={() => setAddressSource('provider_offering')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block">{t('booking.atProviderLocation')}</span>
                    <span className="block text-xs text-slate-500">{providerAddrText}</span>
                  </span>
                </label>
              ) : null}
              {supports.custom ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="addr-source"
                    checked={addressSource === 'custom'}
                    onChange={() => setAddressSource('custom')}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="block">{t('booking.atOtherAddress')}</span>
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
                  </span>
                </label>
              ) : null}
            </fieldset>
          );
        })() : null}

        {/* Accommodation — only when service is at owner's property */}
        {isAtOwnerProperty ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
            <input
              type="checkbox"
              checked={withAccommodation}
              onChange={(e) => setWithAccommodation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            <span>
              <span className="block font-medium">Accommodation included</span>
              <span className="block text-xs text-slate-500">
                The provider will stay at my property for the duration of the service.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      {/* Right column — When */}
      <div className="flex min-h-0 flex-1 flex-col py-4 pb-2">
        {/* Mode toggle */}
        <div className="mb-3 flex shrink-0 gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-800">
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
                'flex-1 rounded-lg py-1.5 text-sm font-medium transition',
                bookingMode === mode
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              ].join(' ')}
            >
              {mode === 'slots' ? 'Time slots' : 'Date range'}
            </button>
          ))}
        </div>

        {bookingMode === 'range' ? (
          <DateRangePicker
            value={dateRange}
            onChange={(isoStart, durationMin) => setDateRange({ isoStart, durationMin })}
            onClear={() => setDateRange(null)}
          />
        ) : (
          <>
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
            {selectedSlots.size === 0 ? (
              <p className="mt-1 shrink-0 text-xs text-slate-400">Select at least one time to continue.</p>
            ) : null}
          </>
        )}
      </div>

      </div>{/* end body columns */}

      {/* Pinned footer — always visible, never scrolls away */}
      <div className="shrink-0 space-y-3 border-t border-slate-200 pb-4 pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:border-slate-800">
        <TextareaField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Anything the provider should know"
        />

        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <p>
            {serviceLabel} · {fmtDuration(effectiveDuration)} · {provider.fullName}
          </p>
          <p className="mt-1 font-medium">
            {bookingMode === 'slots' && selectedSlots.size > 1
              ? `${selectedSlots.size} slots · Total ≈ $${((previewCents * selectedSlots.size) / 100).toFixed(2)} ($${(previewCents / 100).toFixed(2)} each)`
              : `Total ≈ $${(previewCents / 100).toFixed(2)} (${offering.hourlyRateCents / 100}/h)`}
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" disabled={busy || (bookingMode === 'range' ? !dateRange : selectedSlots.size === 0)}>
          {busy
            ? 'Booking…'
            : bookingMode === 'slots' && selectedSlots.size > 1
              ? `Confirm ${selectedSlots.size} bookings`
              : 'Confirm booking'}
        </Button>
      </div>
    </form>
  );
}
