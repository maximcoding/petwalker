'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { placeholderAvatarUrl } from '@/lib/placeholder-images';

import type { ReviewWithAuthor } from '@petwalker/shared/types';

interface Props {
  providerId: string;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Cursor-paginated list of reviews for a provider, rendered as a stack of
 * cards with avatar, stars, body, and date. Empty state is handled here
 * because the page-level layout shouldn't have to know about review counts.
 */
export function ReviewsList({ providerId }: Props): JSX.Element {
  const { t, i18n } = useTranslation();

  const q = useInfiniteQuery({
    queryKey: ['provider-reviews', providerId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.reviews.forProvider(providerId, { cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const items: ReviewWithAuthor[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (q.isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (q.error) {
    return <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{t('reviews.empty')}</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((r) => (
          <li
            key={r.bookingId}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-start gap-3">
              <Image
                src={r.authorAvatarUrl ?? placeholderAvatarUrl(r.ownerId)}
                alt={r.authorName || ''}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.authorName || '—'}</span>
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-current' : 'opacity-30'}`}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  <span className="text-xs text-slate-500">
                    · {formatDate(r.createdAt, i18n.language)}
                  </span>
                </div>
                {r.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {r.body}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {q.hasNextPage ? (
        <div className="flex justify-center">
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
  );
}
