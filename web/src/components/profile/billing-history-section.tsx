'use client';

import type { BillingHistoryEntry } from '@petwalker/shared/types';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';

/**
 * Owner-side history of past payments + refunds.
 *
 * Cursor-paginated via `useInfiniteQuery`. Each row shows date / service
 * + counterparty / amount / refund / net + an Invoice PDF link that
 * fetches with the auth header and downloads via Blob URL (the endpoint
 * sits behind CognitoGuard so a plain `<a href>` won't carry the token).
 */
export function BillingHistorySection(): JSX.Element {
  const { t } = useTranslation();

  const q = useInfiniteQuery({
    queryKey: ['billing-history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.payments.billing({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const downloadInvoice = useMutation({
    mutationFn: async (bookingId: string) => {
      const blob = await api.payments.invoicePdf(bookingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke a tick later so the click has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  if (q.isLoading) return <SkeletonList count={3} />;
  if (q.error) {
    return <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />;
  }

  const items: BillingHistoryEntry[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{t('billingHistory.empty')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-3 font-medium">{t('billingHistory.date')}</th>
              <th className="py-2 pr-3 font-medium">{t('billingHistory.service')}</th>
              <th className="py-2 pr-3 font-medium">{t('billingHistory.counterparty')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('billingHistory.amount')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('billingHistory.refund')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('billingHistory.net')}</th>
              <th className="py-2 pr-3 font-medium">{t('billingHistory.status')}</th>
              <th className="py-2 pr-0 font-medium">{t('billingHistory.invoice')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.paymentId}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                  {new Date(row.occurredAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-3 capitalize">{row.serviceType.replace('_', ' ')}</td>
                <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                  {row.counterpartyName ?? '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {fmtMoney(row.amountCents, row.currency)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                  {row.refundedCents > 0 ? `−${fmtMoney(row.refundedCents, row.currency)}` : '—'}
                </td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums">
                  {fmtMoney(row.netCents, row.currency)}
                </td>
                <td className="py-2 pr-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="py-2 pr-0">
                  <button
                    type="button"
                    onClick={() => downloadInvoice.mutate(row.bookingId)}
                    disabled={downloadInvoice.isPending}
                    className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50 dark:text-brand-300"
                  >
                    {t('billingHistory.invoicePdf')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {q.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            {q.isFetchingNextPage ? <Spinner size="sm" /> : t('billingHistory.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function fmtMoney(cents: number, currency: string): string {
  // Intl handles the symbol + locale formatting; fall back to a manual
  // currency-code prefix if Intl can't represent the supplied currency
  // (defensive — SUPPORTED_CURRENCIES are all known to Intl).
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function StatusPill({ status }: { status: BillingHistoryEntry['status'] }): JSX.Element {
  const tone: Record<BillingHistoryEntry['status'], string> = {
    requires_action: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    succeeded: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${tone[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
