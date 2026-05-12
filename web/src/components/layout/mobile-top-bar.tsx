'use client';

import type { User } from '@petwalker/shared/types';
import Link from 'next/link';
import type { JSX } from 'react';

import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { useViewMode } from '@/contexts/view-mode-context';

import { Container } from './container';
import { homeHref } from './nav';

interface Props {
  me: User;
}

/**
 * MobileTopBar — slim header on mobile (< md). The full nav lives in
 * `BottomTabBar`; this row keeps logo + bell + avatar reachable so push
 * notifications and account actions don't disappear on small screens.
 */
export function MobileTopBar({ me }: Props): JSX.Element {
  const { mode } = useViewMode();
  return (
    <header className="sticky top-0 z-sticky shrink-0 border-b border-border-subtle bg-surface-raised">
      <Container>
        <div className="flex h-14 items-center justify-between gap-3">
          <Link
            href={homeHref(mode)}
            className="text-base font-bold tracking-tight text-ink-primary"
          >
            petwalker
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu me={me} />
          </div>
        </div>
      </Container>
    </header>
  );
}
