'use client';

import type { ServiceProviderListing } from '@petwalker/shared/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ProviderCard } from '@/components/provider-card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonGrid } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

/**
 * Owner-only saved-providers list. Backed by GET /me/favorites which
 * returns the same `ServiceProviderListing` shape as /providers, so the
 * page reuses `ProviderCard` (with `showDistance` off — no search origin).
 *
 * The query key is `['favorites']` so the toggle button can invalidate it
 * after every add/remove and have the list re-fetch (un-favoriting drops
 * the row from the page; we don't try to splice a single row out).
 */
export default function FavoritesPage(): JSX.Element {
  const { t } = useTranslation();

  const q = useInfiniteQuery({
    queryKey: ['favorites'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.favorites.list({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const items: ServiceProviderListing[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex h-full flex-col gap-6 py-8">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">{t('favorites.title')}</h1>
        <p className="mt-1 text-xs text-slate-500">{t('favorites.subtitle')}</p>
      </header>

      {q.isLoading ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SkeletonGrid count={6} />
        </div>
      ) : q.error ? (
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('favorites.empty')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('favorites.emptyHint')}</p>
        </div>
      ) : (
        <>
          <p className="shrink-0 text-xs text-slate-500">
            {t('favorites.count', { count: items.length })}
          </p>
          <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((p) => (
                <li key={p.userId}>
                  <ProviderCard provider={p} showDistance={false} />
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
