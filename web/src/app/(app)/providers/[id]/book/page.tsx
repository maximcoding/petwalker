'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { Pet, ServiceProviderDetail } from '@petwalker/shared/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, type JSX } from 'react';

import { BookingWizard } from '@/components/booking-wizard';
import { ScrollPage } from '@/components/scroll-page';
import { api } from '@/lib/api';

/**
 * /providers/[id]/book — step-based booking wizard.
 *
 * The page is now a thin shell: it fetches the provider + pets, then
 * hands everything to <BookingWizard>. The wizard owns the step
 * state and renders its own top bar / progress / sticky footer (via
 * WizardShell).
 *
 * The submit contract is unchanged from the previous <BookingForm>:
 * `scheduledAts: string[]` so multi-slot bookings still create N
 * bookings one-by-one with partial-success handling.
 */
export default function BookProviderPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const serviceType = (sp.get('service') as ServiceType) || ServiceType.Walking;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const provider = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', id],
    queryFn: () => api.providers.get(id),
    enabled: Boolean(id),
  });
  // Real owners have 1-5 pets; very rarely up to ~10. The seed
  // script over-provisions for testing (admin@admin has 20+) which
  // makes the wizard's pet step a wall of cards. Cap the picker at
  // 10 — if a real owner has more, they manage them in /pets and
  // can still pick from the cap; we can grow this later if data
  // shows it's actually needed.
  const pets = useQuery({
    queryKey: ['pets', 'first-page-for-booking'],
    queryFn: () => api.pets.list({ limit: 10 }),
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
        <p className="text-sm text-ink-tertiary">Loading…</p>
      </ScrollPage>
    );
  }
  if (provider.error) {
    return (
      <ScrollPage>
        <p className="text-sm text-coral-700">{(provider.error as Error).message}</p>
      </ScrollPage>
    );
  }
  if (!provider.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-ink-tertiary">Not found.</p>
      </ScrollPage>
    );
  }

  return (
    <BookingWizard
      provider={provider.data}
      serviceType={serviceType}
      pets={pets.data ?? []}
      busy={busy}
      error={err}
      onSubmit={(v) => void createBookings(v)}
    />
  );
}

function prettifyError(raw: string): string {
  if (raw.includes('OUTSIDE_AVAILABILITY')) return 'Provider is not available at this time.';
  if (raw.includes('OVERLAPPING_BOOKING'))
    return 'That slot is already booked. Pick another time.';
  if (raw.includes('PROVIDER_NO_OFFERING')) return "Provider doesn't offer this service.";
  if (raw.includes('SCHEDULED_AT_TOO_SOON')) return 'Pick a time at least 5 minutes from now.';
  return raw;
}
