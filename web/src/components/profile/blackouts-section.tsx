'use client';

import type { ProviderBlackout } from '@petwalker/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BlackoutsSection(): JSX.Element {
  const qc = useQueryClient();
  const today = todayStr();

  const { data: blackouts = [], isLoading } = useQuery<ProviderBlackout[]>({
    queryKey: ['blackouts'],
    queryFn: () => api.users.listBlackouts(),
  });

  const [draft, setDraft] = useState({ startDate: today, endDate: today, reason: '' });
  const [adding, setAdding] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      api.users.createBlackout({
        startDate: draft.startDate,
        endDate: draft.endDate,
        reason: draft.reason || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['blackouts'] });
      setAdding(false);
      setDraft({ startDate: today, endDate: today, reason: '' });
      toast.success('Unavailability period saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.users.deleteBlackout(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['blackouts'] });
      toast.success('Removed');
    },
    onError: () => toast.error('Failed to remove'),
  });

  const draftValid = draft.endDate >= draft.startDate;

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {blackouts.length === 0 && !adding && (
        <p className="text-sm text-slate-500">No unavailability periods set.</p>
      )}

      <ul className="space-y-2">
        {blackouts.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
          >
            <div>
              <span className="font-medium">
                {b.startDate} → {b.endDate}
              </span>
              {b.reason && <span className="ml-2 text-slate-500">· {b.reason}</span>}
            </div>
            <button
              type="button"
              className="text-red-500 hover:text-red-700 text-xs"
              onClick={() => deleteMut.mutate(b.id)}
              disabled={deleteMut.isPending}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3 dark:border-slate-700">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium">From</label>
              <input
                type="date"
                min={today}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    startDate: e.target.value,
                    endDate: e.target.value > d.endDate ? e.target.value : d.endDate,
                  }))
                }
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium">To (inclusive)</label>
              <input
                type="date"
                min={draft.startDate}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Reason (optional)</label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Summer vacation"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
            />
          </div>
          {!draftValid && (
            <p className="text-xs text-red-500">End date must be on or after start date.</p>
          )}
          <div className="flex gap-2">
            <Button
             
              disabled={!draftValid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + Add unavailability period
        </Button>
      )}
    </div>
  );
}
