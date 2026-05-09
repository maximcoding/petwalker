'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { NotificationBell } from '@/components/notification-bell';
import { SiteFooter } from '@/components/site-footer';
import { PageLoading } from '@/components/ui/spinner';
import { UserMenu } from '@/components/user-menu';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { ViewModeProvider, useViewMode } from '@/contexts/view-mode-context';
import { api } from '@/lib/api';
import { getMe } from '@/lib/auth';


/**
 * Top-level navbar item shape.
 *
 * `i18nKey` resolves under the `nav.*` namespace. Items are chosen by the
 * active view mode — see `buildNav` below.
 */
interface NavItem {
  href: string;
  i18nKey: string;
}

/**
 * Build the role-aware nav. Owners and providers share Bookings,
 * Favorites (owner-only) and Messages (both). The two role-specific
 * additions are:
 *
 *  - Owner mode → Pets, Find a provider, My Bookings, Favorites, Messages
 *  - Provider mode → Order Feed, Managed Bookings, Messages
 *
 * Bookings appears for both modes; the page already filters rows by
 * ownerId vs providerId so it works as-is.
 */
function buildNav(mode: 'owner' | 'provider'): NavItem[] {
  if (mode === 'provider') {
    return [
      { href: '/feed', i18nKey: 'nav.feed' },
      { href: '/bookings', i18nKey: 'nav.managedBookings' },
      { href: '/messages', i18nKey: 'nav.messages' },
    ];
  }
  return [
    { href: '/pets', i18nKey: 'nav.pets' },
    { href: '/providers', i18nKey: 'nav.providers' },
    { href: '/bookings', i18nKey: 'nav.myBookings' },
    { href: '/favorites', i18nKey: 'nav.favorites' },
    { href: '/messages', i18nKey: 'nav.messages' },
  ];
}

function NavBar({ me }: { me: User }): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { mode } = useViewMode();
  const items = useMemo(() => buildNav(mode), [mode]);
  const homeHref = mode === 'provider' ? '/feed' : '/providers';

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="font-semibold">
            petwalker
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {items.map((n) => {
              const active = pathname === n.href || pathname?.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    active
                      ? 'font-medium text-brand-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                >
                  {t(n.i18nKey)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserMenu me={me} />
        </div>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: PropsWithChildren): JSX.Element {
  const router = useRouter();

  // Cognito identity gate — bounce unauthenticated visitors out before
  // attempting any backend call.
  const session = useQuery({
    queryKey: ['cognito-me'],
    queryFn: () => getMe(),
    staleTime: 60_000,
  });

  // Backend `User` row — required by the avatar menu, role-aware nav and
  // the view-mode provider. Only enabled once Cognito identity confirms.
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
    enabled: session.data != null,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!session.isLoading && session.data == null) {
      router.replace('/sign-in');
    }
  }, [session.data, session.isLoading, router]);

  if (session.isLoading || !session.data || me.isLoading || !me.data) {
    return <PageLoading />;
  }

  // App shell: header (shrink-0) at top, main (overflow-hidden) in the
  // middle, SiteFooter (shrink-0) pinned to the bottom of the viewport.
  // Each page is given the full remaining height (h-full) and decides
  // its own scroll layout — list pages keep their title + filters fixed
  // and scroll only the items list, while content pages scroll their
  // body normally. The footer stays out of every page's scroll area.
  return (
    <ViewModeProvider me={me.data}>
      <NotificationsProvider>
        <div className="flex h-screen flex-col">
          <NavBar me={me.data} />
          <main className="flex-1 overflow-hidden">
            <div className="mx-auto h-full w-full max-w-5xl px-6">{children}</div>
          </main>
          <SiteFooter />
        </div>
      </NotificationsProvider>
    </ViewModeProvider>
  );
}
