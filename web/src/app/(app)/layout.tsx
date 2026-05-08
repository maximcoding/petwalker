'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { LangSwitcher } from '@/components/lang-switcher';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PageLoading } from '@/components/ui/spinner';
import { getMe, signOut } from '@/lib/auth';

interface NavItem {
  href: '/me' | '/pets' | '/providers' | '/me/favorites' | '/bookings' | '/profile';
  key: 'me' | 'pets' | 'providers' | 'favorites' | 'bookings' | 'profile';
}

const NAV: NavItem[] = [
  { href: '/me', key: 'me' },
  { href: '/pets', key: 'pets' },
  { href: '/providers', key: 'providers' },
  { href: '/me/favorites', key: 'favorites' },
  { href: '/bookings', key: 'bookings' },
  { href: '/profile', key: 'profile' },
];

export default function AppLayout({ children }: PropsWithChildren): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const me = await getMe();
      if (!me) {
        router.replace('/sign-in');
        return;
      }
      setReady(true);
    })();
  }, [router]);

  async function handleSignOut(): Promise<void> {
    const ok = await confirm({
      title: t('confirms.signOut'),
      body: t('confirms.signOutBody'),
      confirmLabel: t('nav.signOut'),
    });
    if (!ok) return;
    await signOut();
    router.replace('/');
  }

  if (!ready) return <PageLoading />;

  // App shell: header is fixed (shrink-0), main is overflow-hidden. Each
  // page is given the full remaining height (h-full) and decides its own
  // scroll layout — list pages keep their title + filters fixed and scroll
  // only the items list, while content pages scroll their body normally.
  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/me" className="font-semibold">
              petwalker
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    pathname === n.href || pathname?.startsWith(`${n.href}/`)
                      ? 'font-medium text-brand-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                >
                  {t(`nav.${n.key}`)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full max-w-5xl px-6">{children}</div>
      </main>
    </div>
  );
}
