'use client';

import { BookingStatus } from '@petwalker/shared/enums';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { previewCancellation } from '@/lib/cancellation-preview';
import { prettifyError } from '@/lib/prettify-error';

import type { Booking, User } from '@petwalker/shared/types';

interface TabDef {
  value: BookingStatus | 'all';
  i18nKey: 'all' | 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled';
}
const TABS: TabDef[] = [
  { value: 'all', i18nKey: 'all' },
  { value: BookingStatus.Pending, i18nKey: 'pending' },
  { value: BookingStatus.Confirmed, i18nKey: 'confirmed' },
  { value: BookingStatus.InProgress, i18nKey: 'inProgress' },
  { value: BookingStatus.Completed, i18nKey: 'completed' },
  { value: BookingStatus.Cancelled, i18nKey: 'cancelled' },
];

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

function StatusPill({ status }: { status: BookingStatus }): JSX.Element {
  const tone: Record<BookingStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-slate-200 text-slate-700',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${tone[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

interface ActionsProps {
  booking: Booking;
  meId: string;
}

function BookingActions({ booking, meId }: ActionsProps): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const dlg = useConfirm();
  const isOwner = booking.ownerId === meId;
  const isProvider = booking.providerId === meId;

  function invalidate(): void {
    void qc.invalidateQueries({ queryKey: ['bookings'] });
  }
  const onErr = (e: Error): void => {
    toast.error(prettifyError(t, e));
  };

  const confirmM = useMutation({
    mutationFn: () => api.bookings.confirm(booking.id),
    onSuccess: () => {
      invalidate();
      toast.success(t('bookings.confirmed'));
    },
    onError: onErr,
  });
  const start = useMutation({
    mutationFn: () => api.bookings.start(booking.id),
    onSuccess: () => {
      invalidate();
      toast.success(t('bookings.inProgress'));
    },
    onError: onErr,
  });
  const end = useMutation({
    mutationFn: () => api.bookings.end(booking.id),
    onSuccess: () => {
      invalidate();
      toast.success(t('bookings.completed'));
    },
    onError: onErr,
  });
  const cancel = useMutation({
    mutationFn: () => api.bookings.cancel(booking.id),
    onSuccess: () => {
      invalidate();
      toast.success(t('toasts.cancelled'));
    },
    onError: onErr,
  });

  const cancelRemainingMutation = useMutation({
    mutationFn: (seriesId: string) => api.bookings.cancelRemaining(seriesId, {}),
    onSuccess: (res) => {
      toast.success(`Cancelled ${res.cancelledCount} remaining session(s)`);
      invalidate();
    },
    onError: onErr,
  });

  const busy =
    confirmM.isPending || start.isPending || end.isPending || cancel.isPending;

  async function onCancelClick(): Promise<void> {
    const preview = previewCancellation({
      priceCents: booking.priceCents,
      scheduledAt: booking.scheduledAt,
      cancelledBy: isProvider ? 'provider' : 'owner',
    });
    const fmt = (c: number): string => `$${(c / 100).toFixed(2)}`;
    const ok = await dlg({
      title: t('confirms.cancelBooking'),
      body: t('confirms.cancelBookingBody', {
        refund: fmt(preview.refundCents),
        appFee: fmt(preview.appFeeCents + preview.providerFeeCents),
      }),
      destructive: true,
      confirmLabel: t('bookings.cancelBooking'),
    });
    if (ok) cancel.mutate();
  }

  async function onEndClick(): Promise<void> {
    const ok = await dlg({
      title: t('confirms.endWalk'),
      body: t('confirms.endWalkBody', { distance: '—' }),
      confirmLabel: t('bookings.end'),
    });
    if (ok) end.mutate();
  }

  const buttons: JSX.Element[] = [];

  if (isProvider && booking.status === BookingStatus.Pending) {
    buttons.push(
      <Button key="c" disabled={busy} onClick={() => confirmM.mutate()}>
        {confirmM.isPending ? <Spinner size="sm" /> : t('bookings.confirm')}
      </Button>,
    );
  }
  if (isProvider && booking.status === BookingStatus.Confirmed) {
    buttons.push(
      <Button key="s" disabled={busy} onClick={() => start.mutate()}>
        {start.isPending ? <Spinner size="sm" /> : t('bookings.start')}
      </Button>,
    );
  }
  if (isProvider && booking.status === BookingStatus.InProgress) {
    buttons.push(
      <Button key="e" disabled={busy} onClick={onEndClick}>
        {end.isPending ? <Spinner size="sm" /> : t('bookings.end')}
      </Button>,
    );
  }
  if (
    (isOwner || isProvider) &&
    (booking.status === BookingStatus.Pending ||
      booking.status === BookingStatus.Confirmed)
  ) {
    buttons.push(
      <Button key="x" variant="danger" disabled={busy} onClick={onCancelClick}>
        {cancel.isPending ? <Spinner size="sm" /> : t('bookings.cancelBooking')}
      </Button>,
    );
  }

  if (booking.recurringSeriesId &&
    (booking.status === BookingStatus.Pending || booking.status === BookingStatus.Confirmed)) {
    buttons.push(
      <Button
        key="cs"
        variant="secondary"
        className="border-orange-300 text-orange-600 hover:bg-orange-50"
        disabled={cancelRemainingMutation.isPending}
        onClick={async () => {
          const ok = await dlg({
            title: 'Cancel remaining sessions',
            body: 'This will cancel all future pending/confirmed sessions in this recurring series.',
            confirmLabel: 'Cancel remaining',
          });
          if (!ok) return;
          cancelRemainingMutation.mutate(booking.recurringSeriesId!);
        }}
      >
        Cancel series
      </Button>,
    );
  }

  if (buttons.length === 0) return <span />;
  return <div className="flex flex-wrap gap-2">{buttons}</div>;
}

export default function BookingsPage(): JSX.Element {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get('status') as BookingStatus | 'all') || 'all';

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  const q = useInfiniteQuery({
    queryKey: ['bookings', tab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.bookings.list({
        status: tab === 'all' ? undefined : tab,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: Booking[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  const { t: tr } = useTranslation();

  return (
    <section className="flex h-full flex-col gap-6 py-8">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold">{tr('bookings.title')}</h1>
        <Link href="/providers">
          <Button variant="secondary">{tr('bookings.findProvider')}</Button>
        </Link>
      </header>

      <nav className="flex shrink-0 flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab2) => {
          const active = tab === tab2.value;
          return (
            <button
              key={tab2.value}
              type="button"
              onClick={() => {
                const next = new URLSearchParams();
                if (tab2.value !== 'all') next.set('status', tab2.value);
                router.push(`/bookings${next.toString() ? `?${next}` : ''}`);
              }}
              className={[
                '-mb-px border-b-2 px-3 py-2 text-sm transition',
                active
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100',
              ].join(' ')}
            >
              {tr(`bookings.${tab2.i18nKey}`)}
            </button>
          );
        })}
      </nav>

      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
        {q.isLoading || me.isLoading ? (
          <SkeletonList count={5} />
        ) : q.error ? (
          <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500">
              {tab === 'all'
                ? tr('bookings.empty')
                : `${tr('bookings.empty')} (${tr(`bookings.${TABS.find((t2) => t2.value === tab)?.i18nKey ?? 'all'}`)})`}
            </p>
            <Link href="/providers" className="mt-3 inline-block">
              <Button>{tr('bookings.bookService')}</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/bookings/${b.id}` as never}
                    className="flex-1 hover:opacity-80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tr(`services.${b.serviceType}`)}</span>
                      <StatusPill status={b.status} />
                      {b.recurringSeriesId ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Recurring
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {fmtWhen(b.scheduledAt)} · {b.durationMin} min · {fmtMoney(b.priceCents)}
                    </p>
                    {b.notes ? (
                      <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">
                        {b.notes}
                      </p>
                    ) : null}
                  </Link>
                  {me.data ? <BookingActions booking={b} meId={me.data.id} /> : null}
                </div>
                {b.status === BookingStatus.Cancelled && b.cancelledBy ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Cancelled by {b.cancelledBy}
                    {b.refundCents > 0 ? ` · refund ${fmtMoney(b.refundCents)}` : ''}
                    {b.appFeeCents > 0 ? ` · app fee ${fmtMoney(b.appFeeCents)}` : ''}
                    {b.providerFeeCents > 0
                      ? ` · provider fee ${fmtMoney(b.providerFeeCents)}`
                      : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {q.hasNextPage ? (
          <div className="my-6 flex justify-center">
            <Button
              variant="secondary"
              disabled={q.isFetchingNextPage}
              onClick={() => q.fetchNextPage()}
            >
              {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
