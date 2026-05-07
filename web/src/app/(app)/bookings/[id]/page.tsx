'use client';

import { BookingStatus } from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PaymentBlock } from '@/components/payment-block';
import { ScrollPage } from '@/components/scroll-page';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoading, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { previewCancellation } from '@/lib/cancellation-preview';
import { prettifyError } from '@/lib/prettify-error';

import type { Booking, User } from '@petwalker/shared/types';

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
};

function statusKey(s: BookingStatus): 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled' {
  if (s === 'in_progress') return 'inProgress';
  return s;
}

export default function BookingDetailPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const confirmDialog = useConfirm();

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });
  const q = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => api.bookings.get(id),
    enabled: Boolean(id),
  });

  function refresh(): void {
    void qc.invalidateQueries({ queryKey: ['booking', id] });
    void qc.invalidateQueries({ queryKey: ['bookings'] });
  }

  const onErr = (e: Error): void => {
    toast.error(prettifyError(t, e));
  };

  const confirmMut = useMutation({
    mutationFn: () => api.bookings.confirm(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.confirmed'));
    },
    onError: onErr,
  });
  const start = useMutation({
    mutationFn: () => api.bookings.start(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.inProgress'));
    },
    onError: onErr,
  });
  const end = useMutation({
    mutationFn: () => api.bookings.end(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.completed'));
    },
    onError: onErr,
  });
  const cancel = useMutation({
    mutationFn: () => api.bookings.cancel(id),
    onSuccess: () => {
      refresh();
      toast.success(t('toasts.cancelled'));
    },
    onError: onErr,
  });

  if (q.isLoading || me.isLoading) {
    return (
      <ScrollPage>
        <PageLoading />
      </ScrollPage>
    );
  }
  if (q.error) {
    return (
      <ScrollPage>
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      </ScrollPage>
    );
  }
  if (!q.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">{t('errors.notFound')}</p>
      </ScrollPage>
    );
  }

  const b = q.data;
  const meId = me.data?.id;
  const isOwner = meId === b.ownerId;
  const isProvider = meId === b.providerId;
  const busy = confirmMut.isPending || start.isPending || end.isPending || cancel.isPending;
  const isCancelled = b.status === BookingStatus.Cancelled;

  async function onCancelClick(): Promise<void> {
    if (!isOwner && !isProvider) return;
    const preview = previewCancellation({
      priceCents: b.priceCents,
      scheduledAt: b.scheduledAt,
      cancelledBy: isProvider ? 'provider' : 'owner',
    });
    const ok = await confirmDialog({
      title: t('confirms.cancelBooking'),
      body: t('confirms.cancelBookingBody', {
        refund: fmtMoney(preview.refundCents),
        appFee: fmtMoney(preview.appFeeCents + preview.providerFeeCents),
      }),
      destructive: true,
      confirmLabel: t('bookings.cancelBooking'),
    });
    if (ok) cancel.mutate();
  }

  async function onEndClick(): Promise<void> {
    const ok = await confirmDialog({
      title: t('confirms.endWalk'),
      body: t('confirms.endWalkBody', { distance: '—' }),
      confirmLabel: t('bookings.end'),
    });
    if (ok) end.mutate();
  }

  return (
    <ScrollPage>
      <section className="space-y-6">
        <div>
          <Link href="/bookings" className="text-sm text-slate-500 hover:underline">
            ← {t('common.back')}
          </Link>
        </div>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t(`services.${b.serviceType}`)}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[b.status]}`}>
          {t(`bookings.${statusKey(b.status)}`)}
        </span>
        <span className="text-sm text-slate-500">{fmtWhen(b.createdAt)}</span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label={t('bookings.when')} value={fmtWhen(b.scheduledAt)} />
        <Stat label={t('bookings.duration')} value={`${b.durationMin} min`} />
        <Stat label={t('bookings.price')} value={fmtMoney(b.priceCents)} />
      </div>

      {b.notes ? (
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-2 text-sm font-medium text-slate-500">{t('common.notes')}</h2>
          <p className="whitespace-pre-wrap text-sm">{b.notes}</p>
        </section>
      ) : null}

      <PaymentBlock bookingId={b.id} isOwner={isOwner} />

      <section className="flex flex-wrap gap-2">
        {isProvider && b.status === BookingStatus.Pending ? (
          <Button disabled={busy} onClick={() => confirmMut.mutate()}>
            {confirmMut.isPending ? <Spinner size="sm" /> : t('bookings.confirm')}
          </Button>
        ) : null}
        {isProvider && b.status === BookingStatus.Confirmed ? (
          <Button disabled={busy} onClick={() => start.mutate()}>
            {start.isPending ? <Spinner size="sm" /> : t('bookings.start')}
          </Button>
        ) : null}
        {isProvider && b.status === BookingStatus.InProgress ? (
          <Button disabled={busy} onClick={onEndClick}>
            {end.isPending ? <Spinner size="sm" /> : t('bookings.end')}
          </Button>
        ) : null}
        {(isOwner || isProvider) &&
        (b.status === BookingStatus.Pending || b.status === BookingStatus.Confirmed) ? (
          <Button variant="danger" disabled={busy} onClick={onCancelClick}>
            {cancel.isPending ? <Spinner size="sm" /> : t('bookings.cancelBooking')}
          </Button>
        ) : null}
        {b.status === BookingStatus.InProgress ? (
          <Button variant="secondary" onClick={() => router.push(`/bookings/${b.id}/active`)}>
            {t('bookings.viewLive')}
          </Button>
        ) : null}
      </section>

      {isCancelled ? (
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <h2 className="mb-2 text-sm font-medium">{t('bookings.cancellation')}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <span className="text-slate-500">{t('bookings.cancelledBy')}: </span>
              <span className="font-medium capitalize">{b.cancelledBy ?? '—'}</span>
            </li>
            {b.cancelledAt ? (
              <li>
                <span className="text-slate-500">{t('bookings.when')}: </span>
                {fmtWhen(b.cancelledAt)}
              </li>
            ) : null}
            {b.cancellationReason ? (
              <li>
                <span className="text-slate-500">Reason: </span>
                {b.cancellationReason}
              </li>
            ) : null}
            <li>
              <span className="text-slate-500">{t('bookings.refund')}: </span>
              <span className="font-medium">{fmtMoney(b.refundCents)}</span>
            </li>
            {b.appFeeCents > 0 ? (
              <li>
                <span className="text-slate-500">{t('bookings.appFee')}: </span>
                <span className="font-medium">{fmtMoney(b.appFeeCents)}</span>
              </li>
            ) : null}
            {b.providerFeeCents > 0 ? (
              <li>
                <span className="text-slate-500">{t('bookings.providerFee')}: </span>
                <span className="font-medium">{fmtMoney(b.providerFeeCents)}</span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
      </section>
    </ScrollPage>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
