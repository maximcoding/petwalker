'use client';

import { UserRole } from '@petwalker/shared/enums';
import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/lib/api';


/**
 * Tabbed Settings Hub.
 *
 * Phase 2 of the IA refactor splits the legacy single-page /profile into
 * named sub-routes so each surface has its own URL and the page stays
 * scrollable per-section instead of one long stack.
 *
 * Tab visibility:
 *  - Personal, Security, Finances → always shown
 *  - Provider tools → only when role is Provider or Both
 *
 * The page heading and subtitle stay constant across tabs; the tabs
 * themselves are sticky just below the nav so the active section's
 * H2/headers can scroll independently.
 */
interface TabDef {
  href: string;
  i18nKey: string;
  /** Predicate gating visibility. Defaults to always-visible. */
  show?: (me: User) => boolean;
}

const TABS: TabDef[] = [
  { href: '/profile/personal', i18nKey: 'profile.tabs.personal' },
  { href: '/profile/security', i18nKey: 'profile.tabs.security' },
  {
    href: '/profile/provider',
    i18nKey: 'profile.tabs.provider',
    show: (me) => me.role === UserRole.Provider || me.role === UserRole.Both,
  },
  { href: '/profile/finances', i18nKey: 'profile.tabs.finances' },
  { href: '/profile/preferences', i18nKey: 'profile.tabs.preferences' },
];

export default function ProfileLayout({ children }: PropsWithChildren): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
    staleTime: 30_000,
  });

  const visibleTabs = useMemo(() => {
    if (!me.data) return TABS.filter((tab) => !tab.show);
    return TABS.filter((tab) => !tab.show || tab.show(me.data!));
  }, [me.data]);

  // Custom scroll layout (NOT ScrollPage). Why: we need the sticky tab
  // bar to stick flush with the top of the scroll viewport. ScrollPage
  // adds `pt-8` which creates a void above any sticky child where
  // scrolling content bleeds through. Here we own the scroll container
  // and apply spacing inside the children area only.
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="bg-white px-1 pb-3 pt-6 dark:bg-slate-950">
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('profile.subtitle')}</p>
      </header>

      <nav
        aria-label={t('profile.tabsLabel')}
        // Sticky tab bar.
        // - `flex-wrap` lets tabs reflow onto a second row on narrow
        //   widths instead of triggering an ugly horizontal scrollbar.
        //   Browsers were showing the scrollbar even when content fit
        //   because `overflow-x-auto` reserves a track on some OSes.
        // - py-4 + per-link py-2 px-4 gives a 56-ish-px tall bar with
        //   comfortable tap targets and stronger visual presence.
        className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-1 py-4 dark:border-slate-800 dark:bg-slate-950"
      >
        {visibleTabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? 'rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
              }
            >
              {t(tab.i18nKey)}
            </Link>
          );
        })}
      </nav>

      <div className="pb-12 pt-6">{children}</div>
    </div>
  );
}
