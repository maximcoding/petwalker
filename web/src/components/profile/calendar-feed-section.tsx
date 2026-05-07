'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';

import type { CalendarFeed } from '@petwalker/shared/types';

/**
 * Provider-side: paste an iCal URL so external (Google/Apple/Outlook)
 * calendar busy times block our booking slots.
 *
 * webcal:// URLs are normalized to https:// before submission — most
 * calendar apps export `webcal://...` and that scheme isn't fetchable.
 */
function normalizeIcalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('webcal://')) {
    return 'https://' + trimmed.slice('webcal://'.length);
  }
  return trimmed;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function CalendarFeedSection(): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const feed = useQuery<CalendarFeed | null>({
    queryKey: ['calendar-feed'],
    queryFn: () => api.calendar.getFeed(),
  });

  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Hydrate the form from the loaded feed (when toggling between accounts
  // or after a refetch). Keep local edits if the user has typed something
  // different from the server value.
  useEffect(() => {
    if (feed.data && !url) {
      setUrl(feed.data.icalUrl);
      setEnabled(feed.data.enabled);
    }
  }, [feed.data, url]);

  const save = useMutation({
    mutationFn: () =>
      api.calendar.upsertFeed({ icalUrl: normalizeIcalUrl(url), enabled }),
    onSuccess: (next) => {
      toast.success(t('toasts.saved'));
      qc.setQueryData(['calendar-feed'], next);
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const sync = useMutation({
    mutationFn: () => api.calendar.syncNow(),
    onSuccess: (res) => {
      toast.success(
        t('profile.calendar.syncedCount', { count: res.eventCount }),
      );
      void qc.invalidateQueries({ queryKey: ['calendar-feed'] });
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const remove = useMutation({
    mutationFn: () => api.calendar.deleteFeed(),
    onSuccess: () => {
      toast.success(t('toasts.deleted'));
      setUrl('');
      setEnabled(true);
      qc.setQueryData(['calendar-feed'], null);
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
    if (ok) remove.mutate();
  }

  if (feed.isLoading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }

  const hasFeed = !!feed.data;
  const dirty =
    !feed.data ||
    feed.data.icalUrl !== normalizeIcalUrl(url) ||
    feed.data.enabled !== enabled;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t('profile.calendar.hint')}</p>

      <Field
        label={t('profile.calendar.icalUrl')}
        type="url"
        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        hint={t('profile.calendar.urlHint')}
      />

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        {t('profile.calendar.enabled')}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!url.trim() || !dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? <Spinner size="sm" /> : t('common.save')}
        </Button>
        {hasFeed ? (
          <Button
            variant="secondary"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            {sync.isPending ? <Spinner size="sm" /> : t('profile.calendar.testFetch')}
          </Button>
        ) : null}
        {hasFeed ? (
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={onDisconnect}
          >
            {remove.isPending ? <Spinner size="sm" /> : t('profile.calendar.disconnect')}
          </Button>
        ) : null}
      </div>

      {hasFeed ? (
        <dl className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{t('profile.calendar.lastSyncedAt')}</dt>
            <dd className="font-medium">{formatDate(feed.data?.lastSyncedAt ?? null)}</dd>
          </div>
          {feed.data?.lastSyncError ? (
            <div className="mt-2 text-red-600">
              <span className="font-medium">{t('profile.calendar.lastError')}: </span>
              {feed.data.lastSyncError}
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
