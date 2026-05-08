'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { api } from '@/lib/api';

import { toggleFavoriteInQueries } from '@/lib/favorites-cache';

interface Props {
  providerId: string;
  /** Current state — used to flip immediately on click (optimistic). */
  favorited: boolean;
  /** "icon" sits on top of a card; "button" is a labeled standalone control. */
  variant?: 'icon' | 'button';
  /** When true, a parent click handler is suppressed via stopPropagation. */
  stopPropagation?: boolean;
}

/**
 * Heart-shaped toggle that flips the favorite state via API and
 * optimistically updates the React Query cache so every list/card showing
 * this provider stays in sync without re-fetching.
 *
 * Why optimistic: the heart should feel instant. The toggle endpoints are
 * idempotent on the server, so a double-tap and a network race both still
 * land on the right state once the server response arrives.
 */
export function FavoriteButton({
  providerId,
  favorited,
  variant = 'icon',
  stopPropagation = true,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async () => {
      // Capture *before* mutate flips the cache — we need to know which
      // direction we're going on the server.
      return favorited
        ? api.favorites.remove(providerId)
        : api.favorites.add(providerId);
    },
    onMutate: () => {
      // Flip every cached listing/detail entry for this provider so any
      // rendered card updates immediately.
      const next = !favorited;
      toggleFavoriteInQueries(qc, providerId, next);
      return { rolledBack: false };
    },
    onError: () => {
      // Roll back the optimistic flip on failure.
      toggleFavoriteInQueries(qc, providerId, favorited);
    },
    onSettled: () => {
      // The favorites listing page depends on the row existing/missing —
      // we don't try to splice it; just invalidate so the page re-fetches.
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const label = favorited ? t('favorites.remove') : t('favorites.add');

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          if (toggle.isPending) return;
          toggle.mutate();
        }}
        aria-label={label}
        aria-pressed={favorited}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition hover:border-rose-400 dark:border-slate-700"
      >
        <Heart
          className={`h-4 w-4 ${favorited ? 'fill-rose-500 stroke-rose-500' : 'stroke-current'}`}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (toggle.isPending) return;
        toggle.mutate();
      }}
      aria-label={label}
      aria-pressed={favorited}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:text-rose-500 dark:bg-slate-900/80 dark:text-slate-300"
    >
      <Heart
        className={`h-4 w-4 ${favorited ? 'fill-rose-500 stroke-rose-500' : 'stroke-current'}`}
        aria-hidden="true"
      />
    </button>
  );
}
