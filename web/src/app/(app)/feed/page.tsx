'use client';

import { useTranslation } from 'react-i18next';

import { ScrollPage } from '@/components/scroll-page';

/**
 * Provider's "Order Feed" — the inbox of open booking requests they can
 * bid on.
 *
 * The IA reserves this slot in the navbar (provider mode); the actual
 * feed is wired up in Phase 5 of the platform plan when the request/bid
 * tables and APIs land. This page is intentionally a placeholder so the
 * navigation contract is stable and we can ship Phase 1 without backend
 * coupling.
 */
export default function FeedPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <ScrollPage>
      <section className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          {t('feed.comingSoonTag')}
        </div>
        <h1 className="text-2xl font-semibold">{t('feed.title')}</h1>
        <p className="max-w-md text-sm text-slate-500">{t('feed.placeholderBody')}</p>
      </section>
    </ScrollPage>
  );
}
