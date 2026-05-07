'use client';

import { useTranslation } from 'react-i18next';

import { Button } from './button';

interface Props {
  error: Error;
  /** Optional retry handler — typically `() => query.refetch()`. */
  onRetry?: () => void;
  /** Override the displayed title. Defaults to a translated "Something went wrong". */
  title?: string;
}

/**
 * Block-level error state for failed queries. Friendly title + raw message
 * (in muted text) + retry button when caller provides one. Drops in anywhere
 * a list/grid would otherwise render.
 */
export function ErrorState({ error, onRetry, title }: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        {title ?? t('errors.generic')}
      </p>
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-4">
          {t('errors.retry')}
        </Button>
      ) : null}
    </div>
  );
}
