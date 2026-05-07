'use client';

import type { ServiceProviderDetail } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ScrollPage } from '@/components/scroll-page';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { placeholderAvatarUrl } from '@/lib/placeholder-images';

function formatHourly(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/h`;
}

export default function ProviderDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  const q = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', id],
    queryFn: () => api.providers.get(id),
    enabled: Boolean(id),
  });

  if (q.isLoading) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Loading…</p>
      </ScrollPage>
    );
  }
  if (q.error) {
    return (
      <ScrollPage>
        <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>
      </ScrollPage>
    );
  }
  if (!q.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Not found.</p>
      </ScrollPage>
    );
  }

  const p = q.data;

  return (
    <ScrollPage>
      <section className="space-y-6">
        <div>
          <Link href="/providers" className="text-sm text-slate-500 hover:underline">
            ← Back to search
          </Link>
        </div>

        <header className="flex items-start gap-4">
          <Image
            src={p.avatarUrl ?? placeholderAvatarUrl(p.userId)}
            alt={p.fullName}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
            unoptimized
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{p.fullName}</h1>
              {p.verified ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Service radius: {p.serviceRadiusKm} km
            </p>
            {p.bio ? <p className="mt-3 max-w-prose text-slate-700 dark:text-slate-300">{p.bio}</p> : null}
          </div>
        </header>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Services</h2>
          {p.offerings.length === 0 ? (
            <p className="text-sm text-slate-500">This provider has no active services.</p>
          ) : (
            <ul className="space-y-2">
              {p.offerings.map((o) => (
                <li
                  key={o.serviceType}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div>
                    <p className="font-medium capitalize">{o.serviceType}</p>
                    <p className="text-sm text-slate-500">{formatHourly(o.hourlyRateCents)}</p>
                  </div>
                  <Link
                    href={`/providers/${p.userId}/book?service=${o.serviceType}`}
                  >
                    <Button>Book</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </ScrollPage>
  );
}
