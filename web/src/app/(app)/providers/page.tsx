'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { ServiceProviderListing } from '@petwalker/shared/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProviderCard } from '@/components/provider-card';
import { ProviderSearchForm, type SearchValues } from '@/components/provider-search-form';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonGrid } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { SEED_LOCATION } from '@/lib/geolocation';

const DEFAULT_RADIUS_KM = 25;

function readSearch(sp: URLSearchParams): SearchValues {
  return {
    serviceType: (sp.get('serviceType') as ServiceType) || ServiceType.Walking,
    lat: sp.get('lat') ? Number(sp.get('lat')) : SEED_LOCATION.lat,
    lng: sp.get('lng') ? Number(sp.get('lng')) : SEED_LOCATION.lng,
    radiusKm: sp.get('radiusKm') ? Number(sp.get('radiusKm')) : DEFAULT_RADIUS_KM,
    scheduledAt: sp.get('scheduledAt') ?? undefined,
    durationMin: sp.get('durationMin') ? Number(sp.get('durationMin')) : undefined,
    minRating: sp.get('minRating') ? Number(sp.get('minRating')) : undefined,
    maxHourlyCents: sp.get('maxHourlyCents') ? Number(sp.get('maxHourlyCents')) : undefined,
  };
}

function writeSearch(v: SearchValues): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('serviceType', v.serviceType);
  sp.set('lat', String(v.lat));
  sp.set('lng', String(v.lng));
  sp.set('radiusKm', String(v.radiusKm));
  if (v.scheduledAt) sp.set('scheduledAt', v.scheduledAt);
  if (v.durationMin) sp.set('durationMin', String(v.durationMin));
  if (v.minRating) sp.set('minRating', String(v.minRating));
  if (v.maxHourlyCents) sp.set('maxHourlyCents', String(v.maxHourlyCents));
  return sp;
}

export default function ProvidersPage(): JSX.Element {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useTranslation();
  const values = useMemo(() => readSearch(new URLSearchParams(sp.toString())), [sp]);

  // Form is hidden behind a "Refine search" toggle so the listing is the
  // primary content. Auto-opens if any non-default filter is active.
  const hasActiveFilters =
    Boolean(values.scheduledAt) ||
    Boolean(values.durationMin) ||
    Boolean(values.minRating) ||
    Boolean(values.maxHourlyCents) ||
    values.serviceType !== ServiceType.Walking ||
    values.radiusKm !== DEFAULT_RADIUS_KM;
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  // Always run the query — sensible defaults come from URL or fallbacks.
  // Backend sorts by distance ascending, so the listing is already
  // proximity-ordered.
  const q = useInfiniteQuery({
    queryKey: ['providers', values],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.providers.search({
        serviceType: values.serviceType,
        lat: values.lat,
        lng: values.lng,
        radiusKm: values.radiusKm,
        scheduledAt: values.scheduledAt
          ? new Date(values.scheduledAt).toISOString()
          : undefined,
        durationMin: values.durationMin,
        minRating: values.minRating,
        maxHourlyCents: values.maxHourlyCents,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: ServiceProviderListing[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex h-full flex-col gap-6 py-8">
      <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('providers.title')}</h1>
        <p className="text-xs text-slate-500">
          {t('providers.showing', { service: values.serviceType, radius: values.radiusKm })} ·{' '}
          {t('providers.sortedByProximity')}
        </p>
      </header>

      <div className="shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setFiltersOpen((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-start"
        >
          <span className="text-sm font-medium">
            {filtersOpen ? t('providers.hideFilters') : t('providers.refineSearch')}
          </span>
          <span className="text-xs text-slate-500">
            {hasActiveFilters && !filtersOpen ? t('providers.filtersActive') : ''}
          </span>
        </button>
        {filtersOpen ? (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <ProviderSearchForm
              initial={values}
              busy={q.isFetching}
              onSubmit={(v) => router.push(`/providers?${writeSearch(v).toString()}`)}
            />
          </div>
        ) : null}
      </div>

      {q.isLoading ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SkeletonGrid count={6} />
        </div>
      ) : q.error ? (
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500">
            {t('providers.empty', { service: values.serviceType, radius: values.radiusKm })}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t('providers.tryWiden')}</p>
        </div>
      ) : (
        <>
          <p className="shrink-0 text-xs text-slate-500">
            {t('providers.providersCount', { count: items.length })}
            {q.hasNextPage ? ` (${t('providers.moreAvailable')})` : ''}
          </p>
          <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((p) => (
                <li key={p.userId}>
                  <ProviderCard provider={p} />
                </li>
              ))}
            </ul>
            {q.hasNextPage ? (
              <div className="my-6 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={q.isFetchingNextPage}
                  onClick={() => q.fetchNextPage()}
                >
                  {q.isFetchingNextPage ? <Spinner size="sm" /> : t('providers.loadMore')}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
