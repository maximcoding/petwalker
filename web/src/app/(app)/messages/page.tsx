'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { ScrollPage } from '@/components/scroll-page';

/**
 * Top-level Messages route — common to both view modes.
 *
 * Until a dedicated conversations index ships, this page directs the user
 * to per-booking chat (each Booking has its own thread, surfaced via the
 * existing `ChatPanel` on the booking detail page). Phase 5 of the
 * platform plan introduces a true Conversations API; this placeholder
 * holds the URL contract in the IA so the navbar item is stable.
 */
export default function MessagesPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <ScrollPage>
      <section className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          {t('messages.comingSoonTag')}
        </div>
        <h1 className="text-2xl font-semibold">{t('messages.title')}</h1>
        <p className="max-w-md text-sm text-slate-500">{t('messages.placeholderBody')}</p>
        <Link
          href="/bookings"
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('messages.openBookings')}
        </Link>
      </section>
    </ScrollPage>
  );
}
