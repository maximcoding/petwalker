'use client';

import { ServiceType } from '@petwalker/shared/enums';
import type { ServiceProviderListing } from '@petwalker/shared/types';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
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

  // Push the query to the URL only — listing follows immediately.
  // Saving to "recent searches" is a separate commit step (Enter, blur,
  // chip click) so live debouncing doesn't pollute the recents list
  // with every partial like "h", "hu", "hud"…
  function pushQueryToUrl(next: string): void {
    const params = writeSearch({ ...values, q: next });
    router.push(`/providers?${params.toString()}`);
  }

  function commitRecent(next: string): void {
    if (next.trim()) setRecent(pushRecentSearch(next));
  }

  function onSearchChange(next: string): void {
    setSearchInput(next);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushQueryToUrl(next);
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearSearch(): void {
    setSearchInput('');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    pushQueryToUrl('');
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

      {/* Free-text search. Debounced into the URL (listing follows live)
          but commits to recents only on Enter/blur so partial keystrokes
          don't pollute the recents list. */}
      <div className="shrink-0 space-y-3">
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              setSearchFocused(false);
              commitRecent(searchInput);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                pushQueryToUrl(searchInput);
                commitRecent(searchInput);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder={t('providers.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-brand-900/40"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={t('common.clear')}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        {/* Recent searches surface only when the input is empty + focused. */}
        {searchFocused && !searchInput.trim() ? (
          <RecentSearchChips
            items={recent}
            onPick={(query) => {
              setSearchInput(query);
              pushQueryToUrl(query);
              commitRecent(query);
            }}
            onClear={() => {
              clearRecentSearches();
              setRecent([]);
            }}
          />
        ) : null}
      </div>

      <ServiceChipRow
        value={values.serviceType}
        onChange={(s) => {
          const next = writeSearch({ ...values, serviceType: s });
          router.push(`/providers?${next.toString()}`);
        }}
      />

      {/* Inline filter toggle — no wrapping card. The form below appears
          flush with the page when expanded so it doesn't compete with
          the search/chips above for attention. */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setFiltersOpen((s) => !s)}
          aria-expanded={filtersOpen}
          className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span>{filtersOpen ? t('providers.hideFilters') : t('providers.refineSearch')}</span>
          {hasActiveFilters && !filtersOpen ? (
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {t('providers.filtersActive')}
            </span>
          ) : null}
        </button>
        {filtersOpen ? (
          <div className="mt-3">
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
