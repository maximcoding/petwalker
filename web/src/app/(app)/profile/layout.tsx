'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { useViewMode } from '@/contexts/view-mode-context';


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
  /**
   * Visibility predicate. Receives the active view mode so toggling
   * Owner ↔ Provider in the UserMenu actually hides/shows provider-only
   * surfaces — gating by raw role would leave provider tabs visible
   * even when the user explicitly switched to Owner view.
   */
  show?: (mode: 'owner' | 'provider') => boolean;
}

const TABS: TabDef[] = [
  { href: '/profile/personal', i18nKey: 'profile.tabs.personal' },
  { href: '/profile/security', i18nKey: 'profile.tabs.security' },
  {
    href: '/profile/provider',
    i18nKey: 'profile.tabs.provider',
    show: (mode) => mode === 'provider',
  },
  { href: '/profile/finances', i18nKey: 'profile.tabs.finances' },
  // Display preferences moved into the avatar UserMenu — Language /
  // Currency / Units are accessed often enough that a top-level
  // dropdown is friendlier than a buried tab.
];

export default function ProfileLayout({ children }: PropsWithChildren): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { mode } = useViewMode();

  const visibleTabs = useMemo(() => {
    return TABS.filter((tab) => !tab.show || tab.show(mode));
  }, [mode]);

  // App-shell main (set by `(app)/layout.tsx`) is now the single
  // scroll context, so this layout no longer owns its own
  // `h-full overflow-y-auto`. `sticky top-0` on the tab bar still
  // pins it relative to the main scroller.
  return (
    <div className="flex flex-col">
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
