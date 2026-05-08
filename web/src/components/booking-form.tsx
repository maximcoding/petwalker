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
  /** ISO start chosen via FreeSlotPicker. null means nothing selected yet. */
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const supports = offering?.supportedSources;
  const [addressSource, setAddressSource] = useState<AddressSource>(() =>
    pickInitialSource(supports),
  );
  const [customAddress, setCustomAddress] = useState<Address | null>(null);

  const previewCents = offering ? Math.round(offering.hourlyRateCents * (duration / 60)) : 0;

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
    if (!petId || !slotStart) return;
    if (addressSource === 'custom' && (!customAddress || !customAddress.text.trim())) {
      // Don't submit with an empty custom address — backend would 422 anyway.
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
            // Slot list depends on duration — drop the previous selection so
            // the user explicitly re-picks under the new constraint.
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

      {/* Where: only the source families the provider opted in to. With one
          option enabled we drop the radio entirely and just show a label —
          there's nothing to choose. The DB CHECK constraint means at least
          one is always true; the empty case is defensive only. */}
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
