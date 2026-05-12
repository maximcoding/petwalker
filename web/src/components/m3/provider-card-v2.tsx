'use client';

import { Heart, MapPin, Star, Verified } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Pill } from '@/components/ui/pill';
import { Tag } from '@/components/ui/tag';
import {
  CATEGORY_HUE,
  CATEGORY_LABELS,
  type MockProvider,
  type ServiceCategory,
} from '@/lib/mock/types';

/**
 * ProviderCardV2 — M3 redesign of the provider listing card.
 *
 * Layout (mobile-first):
 *   ┌────────────────────────────────────┐
 *   │ [Photo with heart top-right]      │   ← 16:9 cover
 *   │ Name                       ★ 4.9  │
 *   │ Park Slope · 0.8 km                │
 *   │ Loose-leash specialist. Rescue dogs│
 *   │ [Walking] [Sitting] [Training]      │
 *   │ ──────────────────────────────────  │
 *   │ from $25/h    Replies in ~18 min    │
 *   └────────────────────────────────────┘
 *
 * Snap-stop width on mobile (260px), grid item on desktop. Photo
 * loads lazily via next/image; falls back to warm-200 placeholder.
 */
export interface ProviderCardV2Props {
  provider: MockProvider;
  /** When true, render as a snap-scroll rail item with min-width. */
  inRail?: boolean;
}

export function ProviderCardV2({ provider, inRail = false }: ProviderCardV2Props): JSX.Element {
  const [favorited, setFavorited] = useState(false);
  const hourly = provider.services
    .map((s) => s.hourlyRateCents)
    .filter((c): c is number => typeof c === 'number');
  const minHourly = hourly.length ? Math.min(...hourly) : null;
  const visibleServices = provider.services.slice(0, 3);

  return (
    <article
      className={
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-subtle transition-shadow hover:shadow-card ' +
        (inRail ? 'w-[260px] shrink-0 snap-start sm:w-[300px]' : '')
      }
    >
      <Link href={`/providers/${provider.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-warm-100">
          <Image
            src={provider.coverPhoto}
            alt={`${provider.name}'s photo`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-slow ease-out group-hover:scale-105"
          />
          {provider.verified && (
            <span className="absolute start-3 top-3">
              <Pill hue="mint" tone="solid" size="sm">
                <Verified className="h-3 w-3" aria-hidden />
                Verified
              </Pill>
            </span>
          )}
          {provider.onTimeOff && provider.backOn && (
            <span className="absolute start-3 bottom-3">
              <Pill hue="warm" tone="solid" size="sm">
                Back on{' '}
                {provider.backOn.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Pill>
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        aria-pressed={favorited}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(e) => {
          e.preventDefault();
          setFavorited((v) => !v);
        }}
        className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised/90 text-ink-secondary shadow-subtle transition-colors hover:text-coral-600"
      >
        <Heart
          className={`h-5 w-5 transition-colors ${favorited ? 'fill-coral-500 text-coral-500' : ''}`}
          aria-hidden
        />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-ink-primary">
            <Link
              href={`/providers/${provider.id}`}
              className="hover:text-brand-700"
            >
              {provider.name}
            </Link>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-primary">
            <Star className="h-4 w-4 fill-sunshine-400 text-sunshine-500" aria-hidden />
            {provider.rating.toFixed(2)}
            <span className="text-xs font-normal text-ink-tertiary">
              ({provider.reviewCount})
            </span>
          </span>
        </div>

        <p className="flex items-center gap-1 text-xs text-ink-tertiary">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {provider.baseAddress} · {provider.distanceKm.toFixed(1)} km
        </p>

        <p className="line-clamp-2 text-sm text-ink-secondary">{provider.shortBio}</p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {visibleServices.map((s) => (
            <Tag
              key={s.category}
              hue={(CATEGORY_HUE[s.category as ServiceCategory] ?? 'brand') as never}
              size="sm"
            >
              {CATEGORY_LABELS[s.category]}
            </Tag>
          ))}
          {provider.services.length > 3 && (
            <span className="inline-flex h-7 items-center text-xs font-medium text-ink-tertiary">
              +{provider.services.length - 3} more
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-3">
          {minHourly ? (
            <span className="text-sm">
              <span className="text-xs text-ink-tertiary">from</span>{' '}
              <span className="font-bold text-ink-primary">
                ${(minHourly / 100).toFixed(0)}
              </span>
              <span className="text-xs text-ink-tertiary">/h</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-ink-secondary">See rates</span>
          )}
          <span className="text-xs text-ink-tertiary">
            Replies in ~{provider.responseTimeAvgMin} min
          </span>
        </div>
      </div>
    </article>
  );
}
