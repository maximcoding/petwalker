'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { useViewMode } from '@/contexts/view-mode-context';

import { buildNav, isActive } from './nav';

/**
 * BottomTabBar — mobile-only primary navigation (< md).
 *
 * Up to 5 tabs (owner mode). Each tab is a 44px+ touch target with an
 * icon over a label. Active tab is brand-coloured; inactive is subdued.
 * Sticky to the bottom of the viewport; safe-area inset is honoured so
 * the row clears the iOS home indicator.
 */
export function BottomTabBar(): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { mode } = useViewMode();
  const items = buildNav(mode);

  return (
    <nav
      aria-label={t('nav.primary', { defaultValue: 'Primary' })}
      className="sticky bottom-0 z-sticky shrink-0 border-t border-border-subtle bg-surface-raised pb-[env(safe-area-inset-bottom)]"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'flex min-h-touch flex-col items-center justify-center gap-0.5 px-2 py-1.5 transition-colors ' +
                  (active
                    ? 'text-brand-600'
                    : 'text-ink-tertiary hover:text-ink-secondary')
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-medium leading-none">
                  {t(n.i18nKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
