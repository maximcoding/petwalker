'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { Pet, ServiceProviderDetail } from '@petwalker/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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

  const create = useMutation({
    mutationFn: (input: {
      petId: string;
      scheduledAt: string;
      durationMin: number;
      notes: string | null;
    }) =>
      api.bookings.create({
        providerId: id,
        petId: input.petId,
        serviceType,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        notes: input.notes,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      router.push('/bookings');
    },
    onError: (e: Error) => setErr(prettifyError(e.message)),
  });

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
    <ScrollPage>
      <section className="mx-auto max-w-xl space-y-6">
        <div>
          <Link
            href={`/providers/${id}`}
            className="text-sm text-slate-500 hover:underline"
          >
            ← Back to {provider.data.fullName}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">
          Book {serviceType} with {provider.data.fullName}
        </h1>

        <BookingForm
          provider={provider.data}
          serviceType={serviceType}
          pets={pets.data ?? []}
          busy={create.isPending}
          error={err}
          onSubmit={(v) => create.mutate(v)}
        />
      </section>
    </ScrollPage>
  );
}

function prettifyError(raw: string): string {
  if (raw.includes('OUTSIDE_AVAILABILITY')) return 'Provider is not available at this time.';
  if (raw.includes('OVERLAPPING_BOOKING')) return 'That slot is already booked. Pick another time.';
  if (raw.includes('PROVIDER_NO_OFFERING')) return "Provider doesn't offer this service.";
  if (raw.includes('SCHEDULED_AT_TOO_SOON')) return 'Pick a time at least 5 minutes from now.';
  return raw;
}
