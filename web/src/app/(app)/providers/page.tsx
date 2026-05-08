'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { ServiceProviderListing } from '@petwalker/shared/types';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProviderCard } from '@/components/provider-card';
import { ProviderSearchForm, type SearchValues } from '@/components/provider-search-form';
import { RecentSearchChips } from '@/components/recent-search-chips';
import { ServiceChipRow } from '@/components/service-chip-row';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonGrid } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { SEED_LOCATION } from '@/lib/geolocation';
import {
  clearRecentSearches,
  loadRecentSearches,
  pushRecentSearch,
} from '@/lib/recent-searches';

const DEFAULT_RADIUS_KM = 25;
/** Wait this long after the user stops typing before firing a search. */
const SEARCH_DEBOUNCE_MS = 300;

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
    q: sp.get('q') ?? undefined,
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
  if (v.q && v.q.trim()) sp.set('q', v.q.trim());
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

  // Free-text search — local state for the input, debounced into the URL.
  // The URL is the single source of truth for what the query fires on, so
  // back/forward + share-link behaviours just work.
  const [searchInput, setSearchInput] = useState<string>(values.q ?? '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());

  // Keep the input in sync if the URL is mutated externally (back/forward,
  // chip click, etc.). Skip the sync while the user is typing — otherwise
  // a debounced URL update would clobber unsent keystrokes.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!searchFocused) setSearchInput(values.q ?? '');
  }, [values.q, searchFocused]);

  function pushQuery(next: string): void {
    const params = writeSearch({ ...values, q: next });
    router.push(`/providers?${params.toString()}`);
    // Bump recent list once the search "settles" — i.e. on each push,
    // not on every keystroke.
    if (next.trim()) setRecent(pushRecentSearch(next));
  }

  function onSearchChange(next: string): void {
    setSearchInput(next);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushQuery(next);
    }, SEARCH_DEBOUNCE_MS);
  }

  // Always run the query — sensible defaults come from URL or fallbacks.
  // Backend sorts by distance ascending, so the listing is already
  // proximity-ordered. Caching:
  //   - staleTime: same query within 30s skips the network entirely.
  //   - placeholderData: keepPreviousData → results stay rendered while
  //     the next page/query loads (no flicker on each keystroke).
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
        q: values.q,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const items: ServiceProviderListing[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex h-full flex-col gap-6 py-8">
      <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('providers.title')}</h1>
        <p className="text-xs text-slate-500">
          {t('providers.showing', {
            service: t(`services.${values.serviceType}`),
            radius: values.radiusKm,
          })}{' '}
          · {t('providers.sortedByProximity')}
        </p>
      </header>

      {/* Free-text search. Debounced into the URL so a fresh page-load
          (or back/forward) hits the same query the user was looking at. */}
      <div className="shrink-0 space-y-2">
        <input
          type="search"
          inputMode="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
              pushQuery(searchInput);
            }
          }}
          placeholder={t('providers.searchPlaceholder')}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {/* Recent searches surface only when the input is empty + focused —
            once the user starts typing, results below are the answer. */}
        {searchFocused && !searchInput.trim() ? (
          <RecentSearchChips
            items={recent}
            onPick={(query) => {
              setSearchInput(query);
              pushQuery(query);
            }}
            onClear={() => {
              clearRecentSearches();
              setRecent([]);
            }}
          />
        ) : null}
      </div>

      <div className="shrink-0">
        <ServiceChipRow
          value={values.serviceType}
          onChange={(s) => {
            const next = writeSearch({ ...values, serviceType: s });
            router.push(`/providers?${next.toString()}`);
          }}
        />
      </div>

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
            {t('providers.empty', {
              service: t(`services.${values.serviceType}`),
              radius: values.radiusKm,
            })}
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
