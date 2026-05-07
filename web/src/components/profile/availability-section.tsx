'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

import type { AvailabilitySlot } from '@petwalker/shared/types';

const DAYS: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function emptyDraft(): AvailabilitySlot {
  return { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' };
}

export function AvailabilitySection(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<AvailabilitySlot[]>({
    queryKey: ['availability'],
    queryFn: () => api.users.getAvailability(),
  });

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setSlots(q.data);
  }, [q.data]);

  const m = useMutation({
    mutationFn: (next: AvailabilitySlot[]) =>
      api.users.replaceAvailability({ slots: next }),
    onSuccess: (next) => {
      qc.setQueryData(['availability'], next);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  function patch(idx: number, patchObj: Partial<AvailabilitySlot>): void {
    setSlots((s) => s.map((slot, i) => (i === idx ? { ...slot, ...patchObj } : slot)));
  }

  function add(): void {
    setSlots((s) => [...s, emptyDraft()]);
  }

  function remove(idx: number): void {
    setSlots((s) => s.filter((_, i) => i !== idx));
  }

  function save(): void {
    for (const s of slots) {
      if (!HHMM_RE.test(s.startTime) || !HHMM_RE.test(s.endTime)) {
        setError('Times must be in HH:MM format (24h).');
        return;
      }
      if (s.startTime >= s.endTime) {
        setError('Each slot must end after it starts.');
        return;
      }
    }
    m.mutate(slots);
  }

  if (q.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (q.error) {
    return <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Recurring weekly slots in UTC. Owners can only book inside one of these slots
        (and not when you’re already booked).
      </p>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
          No availability configured — owners can’t book you yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {slots.map((s, i) => (
            <li
              key={i}
              className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[100px_1fr_1fr_auto] dark:border-slate-800"
            >
              <select
                value={s.dayOfWeek}
                onChange={(e) =>
                  patch(i, {
                    dayOfWeek: Number(e.target.value) as AvailabilitySlot['dayOfWeek'],
                  })
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <span className="w-10 text-slate-500">From</span>
                <input
                  type="time"
                  value={s.startTime}
                  onChange={(e) => patch(i, { startTime: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="w-10 text-slate-500">To</span>
                <input
                  type="time"
                  value={s.endTime}
                  onChange={(e) => patch(i, { endTime: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <Button type="button" variant="danger" onClick={() => remove(i)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={add}>
          + Add slot
        </Button>
        <Button type="button" disabled={m.isPending} onClick={save}>
          {m.isPending ? 'Saving…' : 'Save schedule'}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {m.isSuccess ? <p className="text-sm text-emerald-600">Saved.</p> : null}
    </div>
  );
}
