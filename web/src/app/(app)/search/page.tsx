'use client';

import { LayoutGrid, MapIcon, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { HeroSearch } from '@/components/m3/hero-search';
import { ProviderCardV2 } from '@/components/m3/provider-card-v2';
import { MapPlaceholder } from '@/components/ui/map-placeholder';
import { Tag } from '@/components/ui/tag';
import {
  ALL_CATEGORIES,
  CATEGORY_HUE,
  CATEGORY_LABELS,
  type ServiceCategory,
} from '@/lib/mock';
import { PROVIDERS } from '@/lib/mock/providers';

type View = 'list' | 'map';
type Sort = 'recommended' | 'distance' | 'priceAsc' | 'priceDesc' | 'rating';

export default function SearchPage(): JSX.Element {
  const sp = useSearchParams();
  const initialService = (sp.get('service') as ServiceCategory) || 'walking';
  const initialLocation = sp.get('location') || '';
  const initialDate = sp.get('date') || '';

  const [view, setView] = useState<View>('list');
  const [sort, setSort] = useState<Sort>('recommended');
  const [service, setService] = useState<ServiceCategory>(initialService);

  const results = useMemo(() => {
    const filtered = PROVIDERS.filter((p) =>
      p.services.some((s) => s.category === service),
    );
    switch (sort) {
      case 'distance':
        return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);
      case 'priceAsc':
      case 'priceDesc': {
        const rate = (p: typeof PROVIDERS[number]) => {
          const cents = p.services
            .filter((s) => s.category === service)
            .map((s) => s.hourlyRateCents ?? Number.POSITIVE_INFINITY);
          return cents.length ? Math.min(...cents) : Number.POSITIVE_INFINITY;
        };
        return [...filtered].sort((a, b) =>
          sort === 'priceAsc' ? rate(a) - rate(b) : rate(b) - rate(a),
        );
      }
      case 'rating':
        return [...filtered].sort((a, b) => b.rating - a.rating);
      case 'recommended':
      default:
        return [...filtered].sort(
          (a, b) =>
            b.rating * 2 + (10 - b.distanceKm) - (a.rating * 2 + (10 - a.distanceKm)),
        );
    }
  }, [service, sort]);

  const pins = results.map((p) => ({
    id: p.id,
    lat: 40.68 + p.distanceKm * 0.001,
    lng: -73.95 + p.distanceKm * 0.001,
    label: p.name,
  }));

  return (
    <div className="pb-2">
      {/* Pinned filter chrome — sticks to the top of the app-shell
          main scroller, so the search bar + category chips + sort bar
          stay put while only the provider list scrolls underneath.
          No outer top padding above this sticky element: any gap
          would collapse on scroll and the chrome would jump up ~Npx
          when sticky engages. */}
      <div className="sticky top-0 z-sticky -mx-4 bg-surface-base px-4 pt-3 sm:-mx-6 sm:px-6">
      <HeroSearch
        compact
        initialService={initialService}
        initialLocation={initialLocation}
        initialDate={initialDate}
      />

      {/* Category quick-filter */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-2 pb-2">
          {ALL_CATEGORIES.map((c) => (
            <Tag
              key={c}
              hue={CATEGORY_HUE[c] as never}
              selected={c === service}
              onClick={() => setService(c)}
              size="lg"
            >
              {CATEGORY_LABELS[c]}
            </Tag>
          ))}
        </div>
      </div>

      {/* Result count + sort + view toggle */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pb-3">
        <p className="text-sm text-ink-secondary">
          <span className="font-semibold text-ink-primary">{results.length}</span>{' '}
          {service === 'walking' ? 'walkers' : 'providers'} near you
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-3 text-xs font-medium text-ink-primary hover:bg-warm-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-lg border border-border-default bg-surface-raised px-3 text-xs font-medium text-ink-primary"
          >
            <option value="recommended">Recommended</option>
            <option value="distance">Distance</option>
            <option value="priceAsc">Price (low → high)</option>
            <option value="priceDesc">Price (high → low)</option>
            <option value="rating">Rating</option>
          </select>
          <div className="inline-flex overflow-hidden rounded-lg border border-border-default">
            <button
              type="button"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={
                'inline-flex h-9 items-center gap-1 px-3 text-xs font-medium transition-colors ' +
                (view === 'list'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-surface-raised text-ink-secondary hover:bg-warm-50')
              }
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
            <button
              type="button"
              aria-pressed={view === 'map'}
              onClick={() => setView('map')}
              className={
                'inline-flex h-9 items-center gap-1 border-s border-border-default px-3 text-xs font-medium transition-colors ' +
                (view === 'map'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-surface-raised text-ink-secondary hover:bg-warm-50')
              }
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden />
              Map
            </button>
          </div>
        </div>
      </div>
      </div>{/* /sticky filter chrome */}

      {/* Results — scroll under the sticky chrome */}
      {results.length === 0 ? (
        <p className="mt-12 text-center text-sm text-ink-secondary">
          No {CATEGORY_LABELS[service].toLowerCase()} providers in this area.{' '}
          <button
            type="button"
            onClick={() => setService('walking')}
            className="font-medium text-ink-link hover:underline"
          >
            Try walking instead?
          </button>
        </p>
      ) : view === 'list' ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <ProviderCardV2 key={p.id} provider={p} />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <MapPlaceholder
            center={{ lat: 40.68, lng: -73.95 }}
            radiusKm={8}
            pins={pins}
            aspect="aspect-[16/10]"
          />
          {/* Horizontal carousel of cards corresponding to map pins */}
          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            <div className="flex snap-x snap-mandatory gap-4">
              {results.map((p) => (
                <ProviderCardV2 key={p.id} provider={p} inRail />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
