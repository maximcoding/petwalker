'use client';

import type { User } from '@petwalker/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren } from 'react';

import {
  Container,
  Footer,
  ResponsiveBottomChrome,
  ResponsiveTopChrome,
} from '@/components/layout';
import { ErrorState } from '@/components/ui/error-state';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { PageLoading } from '@/components/ui/spinner';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { ViewModeProvider } from '@/contexts/view-mode-context';
import { api } from '@/lib/api';
import { getMe } from '@/lib/auth';

/**
 * App Shell — sticky chrome around every signed-in route.
 *
 *   Desktop (md+):   Header  →  body  →  Footer
 *   Mobile (< md):   MobileTopBar  →  body  →  BottomTabBar
 *
 * Only the body scrolls; the chrome rows are sticky. List pages keep
 * their own pinned title/filter row inside the body and scroll only
 * the items list (per the brief).
 *
 * Light mode only. No dark variants. Tokens come from
 * `web/src/app/globals.css`.
 */
export default function AppLayout({ children }: PropsWithChildren): JSX.Element {
  const router = useRouter();

  // Cognito identity gate — bounce unauthenticated visitors out before
  // attempting any backend call.
  const session = useQuery({
    queryKey: ['cognito-me'],
    queryFn: () => getMe(),
    staleTime: 60_000,
  });

  // Backend `User` row — required by the avatar menu, role-aware nav
  // and the view-mode provider. Only enabled once Cognito identity
  // confirms.
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

  // Hard-fail surface: the `me` query failed after react-query retries.
  // Without this, the user gets stuck on PageLoading forever when the
  // backend is down, cognito-local is unreachable, or the JWT can't be
  // verified. Always show a recovery option.
  if (session.data != null && me.isError && !me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
        <div className="w-full max-w-md">
          <ErrorState
            error={me.error as Error}
            title="Couldn't load your account"
            onRetry={() => void me.refetch()}
          />
          <div className="mt-3 text-center text-xs text-ink-tertiary">
            If this keeps failing, the backend on :3001 may be down. Check
            <code className="mx-1 rounded bg-warm-100 px-1 py-0.5 font-mono">pnpm --filter @petwalker/backend dev</code>
            is running.
          </div>
        </div>
      </div>
    );
  }

  if (session.isLoading || !session.data || me.isLoading || !me.data) {
    return <PageLoading />;
  }

  return (
    <ViewModeProvider me={me.data}>
      <NotificationsProvider>
        <div className="flex min-h-screen flex-col bg-surface-base">
          <OfflineBanner />
          <ResponsiveTopChrome me={me.data} />

          <main className="flex-1">
            <Container>{children}</Container>
          </main>

          {/* Footer is desktop-only; on mobile the BottomTabBar
              replaces the header and takes the bottom anchor. */}
          <div className="hidden md:block">
            <Footer />
          </div>

          <ResponsiveBottomChrome />
        </div>
      </NotificationsProvider>
    </ViewModeProvider>
  );
}
