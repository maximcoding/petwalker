'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { PetsGrid } from '@/components/pets-grid';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

import type { Pet } from '@petwalker/shared/types';

const PAGE_SIZE = 30;

export default function PetsPage(): JSX.Element {
  const { t } = useTranslation();
  const q = useInfiniteQuery({
    queryKey: ['pets'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.pets.list({ cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: Pet[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex h-full flex-col py-8">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('pets.title')}</h1>
        <Link href="/pets/new">
          <Button>{t('pets.addPet')}</Button>
        </Link>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : q.error ? (
        <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>
      ) : items.length > 0 ? (
        <>
          <p className="mb-3 shrink-0 text-xs text-slate-500">
            {items.length} loaded
            {q.hasNextPage ? ' · scroll for more' : ''}
          </p>
          <div className="min-h-0 flex-1">
            <PetsGrid
              items={items}
              hasNextPage={!!q.hasNextPage}
              isFetchingNextPage={q.isFetchingNextPage}
              onEndReached={() => void q.fetchNextPage()}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('pets.empty')}</p>
          <Link href="/pets/new" className="mt-2 inline-block">
            <Button>{t('pets.addFirst')}</Button>
          </Link>
        </div>
      )}
    </section>
  );
}
