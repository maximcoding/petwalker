'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { TextareaField } from '@/components/ui/field';
import { api } from '@/lib/api';

import type { Review } from '@petwalker/shared/types';

interface Props {
  bookingId: string;
  providerId: string;
}

/**
 * Owner-side leave-a-review form, shown on the booking detail page once
 * the booking is `completed` and the owner hasn't already reviewed it.
 *
 * On success the form is replaced by a confirmation block showing the
 * submitted review — no toast, since the visual swap is the confirmation.
 * Invalidates the provider's review list and the provider listing
 * queries so the new rating shows up everywhere on the next render.
 */
export function LeaveReviewForm({ bookingId, providerId }: Props): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [body, setBody] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // We fetch the existing review (if any) so a returning user sees their
  // submission instead of an empty form. The endpoint returns null when
  // the owner hasn't reviewed yet.
  const existing = useQuery<Review | null>({
    queryKey: ['review', bookingId],
    queryFn: () => api.reviews.forBooking(bookingId),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.reviews.create(bookingId, {
        rating,
        body: body.trim() || null,
      }),
    onSuccess: (review) => {
      setError(null);
      qc.setQueryData(['review', bookingId], review);
      // Provider's reviews list + any provider listings showing rating need to refresh.
      void qc.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
      void qc.invalidateQueries({ queryKey: ['provider', providerId] });
      void qc.invalidateQueries({ queryKey: ['providers'] });
      void qc.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (existing.isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;

  // Already reviewed — show a tiny summary instead of the form.
  if (existing.data) {
    const r = existing.data;
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
        <p className="text-sm font-medium">{t('reviews.thanks')}</p>
        <div className="mt-2 inline-flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < r.rating ? 'fill-current' : 'opacity-30'}`}
              aria-hidden="true"
            />
          ))}
        </div>
        {r.body ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {r.body}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1 || rating > 5) {
          setError(t('reviews.starsRequired'));
          return;
        }
        submit.mutate();
      }}
      className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <h2 className="text-sm font-medium">{t('reviews.leave')}</h2>

      <div className="flex items-center gap-1" role="radiogroup" aria-label={t('reviews.starsLabel')}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hover || rating);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="rounded p-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Star
                className={`h-6 w-6 ${filled ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-400'}`}
                aria-hidden="true"
              />
              <span className="sr-only">{n}</span>
            </button>
          );
        })}
      </div>

      <TextareaField
        label={t('reviews.body')}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('reviews.placeholder')}
        rows={3}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={submit.isPending || rating === 0}>
        {submit.isPending ? t('reviews.submitting') : t('reviews.submit')}
      </Button>
    </form>
  );
}
