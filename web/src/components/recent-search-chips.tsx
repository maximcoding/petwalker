'use client';

import { useTranslation } from 'react-i18next';

interface Props {
  /** Recent search strings, most-recent first. */
  items: string[];
  /** Click handler — fired with the chip's text. */
  onPick: (query: string) => void;
  /** Optional clear-all button next to the chips. */
  onClear?: () => void;
}

/**
 * Compact horizontal row of recent-search chips. Renders nothing when the
 * list is empty, so the parent can mount it unconditionally and it'll be
 * a no-op until there's something to show.
 */
export function RecentSearchChips({ items, onPick, onClear }: Props): JSX.Element | null {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">{t('providers.recentSearches')}:</span>
      {items.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onPick(q)}
          className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
        >
          {q}
        </button>
      ))}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {t('providers.clearRecent')}
        </button>
      ) : null}
    </div>
  );
}
