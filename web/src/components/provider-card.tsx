'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { placeholderAvatarUrl } from '@/lib/placeholder-images';
import { ICONS } from '@/lib/service-icons';

import type { ServiceProviderListing } from '@petwalker/shared/types';

interface Props {
  provider: ServiceProviderListing;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatHourly(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/h`;
}

export function ProviderCard({ provider: p }: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <Link
      href={`/providers/${p.userId}`}
      className="block rounded-2xl border border-slate-200 p-4 transition hover:border-brand-500 dark:border-slate-800"
    >
      <div className="flex gap-3">
        <Image
          src={p.avatarUrl ?? placeholderAvatarUrl(p.userId)}
          alt={p.fullName}
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold">{p.fullName}</h3>
            {p.verified ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                verified
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">≈ {formatDistance(p.distanceM)}</p>
        </div>
      </div>
      {p.bio ? <p className="mt-3 line-clamp-3 text-sm text-slate-600">{p.bio}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {p.offerings.map((o) => {
          const Icon = ICONS[o.serviceType];
          return (
            <span
              key={o.serviceType}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {t(`services.${o.serviceType}`)} · {formatHourly(o.hourlyRateCents)}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
