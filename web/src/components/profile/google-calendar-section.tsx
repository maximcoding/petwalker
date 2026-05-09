'use client';

import type { GoogleCalendarStatus } from '@petwalker/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';

/**
 * Provider-side: link the user's Google Calendar so its busy windows
 * exclude time slots from petwalker bookings.
 *
 * Three render states:
 *  1. NOT CONFIGURED  — backend env has no Google OAuth credentials.
 *                       Show a disabled state explaining the situation.
 *  2. NOT CONNECTED   — show a single "Connect Google Calendar" CTA.
 *  3. CONNECTED       — show "Connected as <email>" + Sync now + Disconnect.
 *
 * Connect flow: clicking Connect calls `/auth/google-calendar/start`
 * to get a Google consent URL, then `window.location` redirects there.
 * After the user clicks Allow, Google redirects back to our backend
 * callback which stores tokens and bounces them to this same page
 * with `?google=connected` in the URL — we surface a toast off that.
 */
export function GoogleCalendarSection(): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  // Prevent the toast from re-firing if the user navigates back/forward
  // with the same `?google=connected` still in the URL.
  const toastedRef = useRef<string | null>(null);

  const status = useQuery<GoogleCalendarStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.calendar.getStatus(),
  });

  // Surface the OAuth round-trip outcome via a toast.
  useEffect(() => {
    const flag = searchParams?.get('google');
    if (!flag || toastedRef.current === flag) return;
    toastedRef.current = flag;
    if (flag === 'connected') {
      toast.success(t('profile.calendar.toastConnected'));
      void qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
    } else if (flag === 'cancelled') {
      toast.info(t('profile.calendar.toastCancelled'));
    } else if (flag === 'error') {
      const reason = searchParams?.get('reason') ?? '';
      toast.error(t('profile.calendar.toastError', { reason }));
    }
  }, [searchParams, qc, t]);

  const startConnect = useMutation({
    mutationFn: () => api.calendar.startGoogleConnect(),
    onSuccess: ({ url }) => {
      // Top-level navigation — fetch can't follow this cross-origin
      // and we want the consent screen rendered in this tab.
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const sync = useMutation({
    mutationFn: () => api.calendar.syncNow(),
    onSuccess: (res) => {
      toast.success(
        t('profile.calendar.syncedCount', { count: res.eventCount }),
      );
      void qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const disconnect = useMutation({
    mutationFn: () => api.calendar.disconnect(),
    onSuccess: () => {
      toast.success(t('profile.calendar.toastDisconnected'));
      qc.setQueryData<GoogleCalendarStatus>(['google-calendar-status'], (prev) =>
        prev ? { ...prev, connected: false, googleEmail: undefined, lastSyncedAt: undefined } : prev,
      );
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  async function onDisconnect(): Promise<void> {
    const ok = await confirm({
      title: t('profile.calendar.disconnectTitle'),
      body: t('profile.calendar.disconnectBody'),
      destructive: true,
      confirmLabel: t('profile.calendar.disconnect'),
    });
    if (ok) disconnect.mutate();
  }

  if (status.isLoading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }

  const data = status.data;

  // ---- 1. NOT CONFIGURED -------------------------------------------------

  if (!data?.configured) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{t('profile.calendar.hint')}</p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {t('profile.calendar.notConfigured')}
        </div>
      </div>
    );
  }

  // ---- 2. NOT CONNECTED --------------------------------------------------

  if (!data.connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{t('profile.calendar.hint')}</p>
        <Button
          onClick={() => startConnect.mutate()}
          disabled={startConnect.isPending}
          className="gap-2"
        >
          {startConnect.isPending ? (
            <Spinner size="sm" />
          ) : (
            <GoogleGlyph className="h-4 w-4" />
          )}
          {t('profile.calendar.connect')}
        </Button>
      </div>
    );
  }

  // ---- 3. CONNECTED ------------------------------------------------------

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            {t('profile.calendar.connected')}
          </p>
          {data.googleEmail ? (
            <p className="flex items-center gap-1.5 truncate text-xs text-emerald-800/80 dark:text-emerald-200/80">
              <Mail className="h-3 w-3" aria-hidden />
              {data.googleEmail}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-xs text-slate-500">
        <dt>{t('profile.calendar.lastSyncedAt')}</dt>
        <dd className="font-medium text-slate-700 dark:text-slate-200">
          {data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : '—'}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
        >
          {sync.isPending ? <Spinner size="sm" /> : t('profile.calendar.syncNow')}
        </Button>
        <Button
          variant="danger"
          disabled={disconnect.isPending}
          onClick={onDisconnect}
        >
          {disconnect.isPending ? <Spinner size="sm" /> : t('profile.calendar.disconnect')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Google "G" mark — inlined SVG (no extra dep) so the connect button
 * carries the brand affordance users expect on social-login buttons.
 */
function GoogleGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
