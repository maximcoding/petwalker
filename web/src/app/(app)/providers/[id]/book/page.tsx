'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { Pet, ServiceProviderDetail } from '@petwalker/shared/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { BookingForm } from '@/components/booking-form';
import { ScrollPage } from '@/components/scroll-page';
import { api } from '@/lib/api';

export default function BookProviderPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const serviceType = (sp.get('service') as ServiceType) || ServiceType.Walking;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();

  const provider = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', id],
    queryFn: () => api.providers.get(id),
    enabled: Boolean(id),
  });
  const pets = useQuery({
    queryKey: ['pets', 'first-page-for-booking'],
    queryFn: () => api.pets.list({ limit: 100 }),
    select: (page) => page.items as Pet[],
  });

  async function createBookings(input: {
    petId: string;
    scheduledAts: string[];
    durationMin: number;
    notes: string | null;
    addressSource: import('@petwalker/shared').AddressSource;
    customAddress?: import('@petwalker/shared').Address;
    withAccommodation: boolean;
  }): Promise<void> {
    setBusy(true);
    setErr(null);
    const failed: Array<{ scheduledAt: string; reason: string }> = [];
    let successCount = 0;

    for (const scheduledAt of input.scheduledAts) {
      try {
        await api.bookings.create({
          providerId: id,
          petId: input.petId,
          serviceType,
          scheduledAt,
          durationMin: input.durationMin,
          notes: input.notes,
          addressSource: input.addressSource,
          customAddress: input.customAddress,
          withAccommodation: input.withAccommodation,
        });
        successCount++;
      } catch (e) {
        failed.push({ scheduledAt, reason: prettifyError((e as Error).message) });
      }
    }

    setBusy(false);

    if (failed.length === 0) {
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      router.push('/bookings');
      return;
    }

    const formatTime = (iso: string) =>
      new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (successCount > 0) {
      // Partial success — navigate but show which slots failed.
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      setErr(
        `${successCount} booking(s) confirmed. ${failed.length} slot(s) could not be booked:\n` +
          failed.map((f) => `• ${formatTime(f.scheduledAt)}: ${f.reason}`).join('\n'),
      );
      router.push('/bookings');
      return;
    }

    // All failed.
    setErr(
      `Could not book any slots:\n` +
        failed.map((f) => `• ${formatTime(f.scheduledAt)}: ${f.reason}`).join('\n'),
    );
  }

  if (provider.isLoading || pets.isLoading) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Loading…</p>
      </ScrollPage>
    );
  }
  if (provider.error) {
    return (
      <ScrollPage>
        <p className="text-sm text-red-600">{(provider.error as Error).message}</p>
      </ScrollPage>
    );
  }
  if (!provider.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Not found.</p>
      </ScrollPage>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Pinned page header */}
      <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/providers/${id}`}
            className="text-sm text-slate-500 hover:underline"
          >
            ← Back to {provider.data.fullName}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            Book {t(`services.${serviceType}`)} with {provider.data.fullName}
          </h1>
        </div>
      </div>

      {/* BookingForm fills remaining height */}
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
        <BookingForm
          provider={provider.data}
          serviceType={serviceType}
          pets={pets.data ?? []}
          busy={busy}
          error={err}
          onSubmit={(v) => void createBookings(v)}
        />
      </div>
    </div>
  );
}

function prettifyError(raw: string): string {
  if (raw.includes('OUTSIDE_AVAILABILITY')) return 'Provider is not available at this time.';
  if (raw.includes('OVERLAPPING_BOOKING')) return 'That slot is already booked. Pick another time.';
  if (raw.includes('PROVIDER_NO_OFFERING')) return "Provider doesn't offer this service.";
  if (raw.includes('SCHEDULED_AT_TOO_SOON')) return 'Pick a time at least 5 minutes from now.';
  return raw;
}
