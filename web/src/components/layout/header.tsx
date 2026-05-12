'use client';

import type { User } from '@petwalker/shared/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { useViewMode } from '@/contexts/view-mode-context';

import { Container } from './container';
import { buildNav, homeHref, isActive } from './nav';

interface Props {
  me: User;
}

/**
 * Header — desktop / tablet top bar (md and up).
 *
 * Logo on the leading side, role-aware nav in the middle, NotificationBell
 * + UserMenu on the trailing side. Sticky to the top of the App Shell;
 * only the body scrolls. Light mode only — no dark variants.
 */
export function Header({ me }: Props): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { mode } = useViewMode();
  const items = buildNav(mode);

  return (
    <header className="sticky top-0 z-sticky shrink-0 border-b border-border-subtle bg-surface-raised/95 backdrop-blur supports-[backdrop-filter]:bg-surface-raised/80">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href={homeHref(mode)}
              className="text-lg font-bold tracking-tight text-ink-primary transition-colors hover:text-brand-600"
            >
              petwalker
            </Link>
            <nav aria-label={t('nav.primary', { defaultValue: 'Primary' })}>
              <ul className="flex items-center gap-1">
                {items.map((n) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        aria-current={active ? 'page' : undefined}
                        className={
                          'inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors ' +
                          (active
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-ink-secondary hover:bg-warm-100 hover:text-ink-primary')
                        }
                      >
                        {t(n.i18nKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu me={me} />
          </div>
        </div>
      </Container>
    </header>
  );
}
