'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressField } from './address-field';
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

const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

interface Props {
  provider: ServiceProviderDetail;
  serviceType: string;
  pets: Pet[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: {
    petId: string;
    scheduledAt: string; // ISO UTC
    durationMin: number;
    notes: string | null;
    addressSource: AddressSource;
    customAddress?: Address;
  }) => void;
}

/**
 * Pick the initial address source based on the offering's `addressDefault`.
 * 'owner' → owner_pet (most natural fallback chain through pet → user)
 * 'provider' → provider_offering (offering override → user fallback)
 * 'either' → owner_pet (still need a default; owner-side feels less surprising)
 */
function defaultAddressSource(addressDefault: string | undefined): AddressSource {
  if (addressDefault === 'provider') return 'provider_offering';
  return 'owner_pet';
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
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [addressSource, setAddressSource] = useState<AddressSource>(() =>
    defaultAddressSource(offering?.addressDefault),
  );
  const [customAddress, setCustomAddress] = useState<Address | null>(null);

  const previewCents = offering ? Math.round(offering.hourlyRateCents * (duration / 60)) : 0;

  const providerAddrText =
    offering?.serviceAddress?.text ?? t('booking.providerLocation');
  const selectedPet = pets.find((p) => p.id === petId);
  const petAddrText = selectedPet?.address?.text ?? t('booking.ownerHome');

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!petId || !slotStart) return;
    if (addressSource === 'custom' && (!customAddress || !customAddress.text.trim())) {
      return;
    }
    onSubmit({
      petId,
      scheduledAt: slotStart,
      durationMin: duration,
      notes: notes || null,
      addressSource,
      customAddress: addressSource === 'custom' ? customAddress ?? undefined : undefined,
    });
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Duration</span>
        <select
          value={duration}
          onChange={(e) => {
            setDuration(Number(e.target.value));
            setSlotStart(null);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
      </label>

      {/* Where: source radio + custom-address textarea when 'custom' is picked. */}
      <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <legend className="px-1 text-sm font-medium">{t('booking.whereLabel')}</legend>
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
      </fieldset>

      <div>
        <span className="mb-2 block text-sm font-medium">When</span>
        <FreeSlotPicker
          providerId={provider.userId}
          serviceType={serviceType as ServiceType}
          durationMin={duration}
          value={slotStart}
          onChange={setSlotStart}
        />
      </div>

      <TextareaField
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        hint="Anything the provider should know"
      />

      <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
        <p>
          {serviceLabel} · {duration} min · {provider.fullName}
        </p>
        <p className="mt-1 font-medium">
          Total ≈ ${(previewCents / 100).toFixed(2)} ({offering.hourlyRateCents / 100}/h)
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={busy || !slotStart}>
        {busy ? 'Booking…' : 'Confirm booking'}
      </Button>
    </form>
  );
}
