'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FreeSlotPicker } from './free-slot-picker';
import { Button } from './ui/button';
import { TextareaField } from './ui/field';

import type { ServiceType } from '@petwalker/shared/enums';
import type { Pet, ServiceProviderDetail } from '@petwalker/shared/types';

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
  }) => void;
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

  const previewCents = offering ? Math.round(offering.hourlyRateCents * (duration / 60)) : 0;

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!petId || !slotStart) return;
    onSubmit({ petId, scheduledAt: slotStart, durationMin: duration, notes: notes || null });
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
