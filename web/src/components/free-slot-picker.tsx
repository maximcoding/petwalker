'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

import type { ServiceType } from '@petwalker/shared/enums';
import type { FreeSlot } from '@petwalker/shared/types';

interface Props {
  providerId: string;
  /** Service type the owner is booking — picks the offering's mode. */
  serviceType: ServiceType;
  /** Booking duration in minutes — fed straight to the free-slots query. */
  durationMin: number;
  /** Set of selected slot ISO starts. */
  value: Set<string>;
  /** Toggle a slot in/out of the selection. */
  onChange: (start: string) => void;
  /** Reset the entire selection. */
  onClear: () => void;
  /** How many days to fetch per page (default 7). */
  daysPerPage?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far ahead the "earliest available" probe looks. */
const EARLIEST_WINDOW_DAYS = 90;
/** Hard ceiling on how far the user can jump (matches backend slot horizon). */
const MAX_HORIZON_DAYS = 180; // ~6 months

/** UTC midnight for `d`. */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Add `days` whole days to `d`. */
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** "yyyy-mm-dd" in the LOCAL zone — what `<input type="date">` produces. */
function formatLocalDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Owner-side slot picker.
 *
 * Replaces the freeform `<input type="datetime-local">` so owners can only
 * pick times where the provider is genuinely free (weekly availability AND
 * not blocked by other bookings or by their external calendar feed).
 *
 * Three affordances handle the 1–6 month booking horizon:
 *   • quick-jump chips (Today / Next week / +1mo / +3mo) for common targets
 *   • a `<input type="date">` lets the owner jump to a specific date
 *   • an "Earliest available" callout pulls the next free slot from a wider
 *     90-day probe so users with no time pressure can book in one click
 *
 * Slots inside a day are grouped Morning / Afternoon / Evening to keep the
 * grid scannable when a window contains many candidates.
 */
export function FreeSlotPicker({
  providerId,
  serviceType,
  durationMin,
  value,
  onChange,
  onClear,
  daysPerPage = 7,
}: Props): JSX.Element {
  const { t, i18n } = useTranslation();

  // Window state is a Date pinned to LOCAL midnight rather than a page index
  // so the date-jump input and quick-jump chips compose cleanly.
  const [windowStart, setWindowStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const windowEnd = useMemo(() => addDays(windowStart, daysPerPage), [windowStart, daysPerPage]);
  const isOnFirstWindow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return windowStart.getTime() === today.getTime();
  }, [windowStart]);

  const q = useQuery<FreeSlot[]>({
    queryKey: [
      'free-slots',
      providerId,
      serviceType,
      durationMin,
      windowStart.toISOString(),
      daysPerPage,
    ],
    queryFn: () =>
      api.providers.freeSlots(providerId, {
        serviceType,
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        durationMin,
        // Step equals duration so adjacent slots never create overlapping bookings.
        stepMin: durationMin,
      }),
    // Slots become stale fast — another booking can fill one any moment.
    staleTime: 30_000,
  });

  // Probe the next 90 days for the very first slot so we can offer a
  // one-click "Earliest available" CTA. Cached separately from the page query
  // because it doesn't move when the user navigates the picker.
  const earliest = useQuery<FreeSlot | null>({
    queryKey: ['free-slots-earliest', providerId, serviceType, durationMin],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slots = await api.providers.freeSlots(providerId, {
        serviceType,
        from: today.toISOString(),
        to: addDays(today, EARLIEST_WINDOW_DAYS).toISOString(),
        durationMin,
        stepMin: Math.min(60, durationMin),
      });
      return slots[0] ?? null;
    },
    staleTime: 60_000,
  });

  // Filter slots that are too soon for the backend (< now + 5 min), then group by day.
  const NOW_BUFFER_MS = 5 * 60 * 1000;
  const byDay = useMemo(() => {
    const cutoff = Date.now() + NOW_BUFFER_MS;
    const future = (q.data ?? []).filter((s) => new Date(s.start).getTime() >= cutoff);
    return groupByDay(future);
  }, [q.data]);

  const fmtDay = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: undefined,
      }),
    [i18n.language],
  );
  const fmtDayLong = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [i18n.language],
  );
  const fmtTime = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }),
    [i18n.language],
  );

  function jump(daysFromToday: number): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = addDays(today, Math.min(daysFromToday, MAX_HORIZON_DAYS));
    setWindowStart(next);
  }

  function jumpToDateString(value: string): void {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return;
    const next = new Date(y, m - 1, d, 0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (next.getTime() < today.getTime()) return; // past dates aren't bookable
    setWindowStart(next);
  }

  function pickEarliest(): void {
    if (!earliest.data) return;
    const start = new Date(earliest.data.start);
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    setWindowStart(startOfDay);
    onChange(earliest.data.start);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Selection chip + Clear All — visible once ≥1 slot is chosen. */}
      {value.size > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm dark:border-brand-900 dark:bg-brand-950">
          <span className="font-medium text-brand-700 dark:text-brand-200">
            {value.size} slot{value.size !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-brand-600 underline hover:no-underline dark:text-brand-300"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {/* Earliest-available callout — silent if no slots in next 90 days. */}
      {earliest.data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <span>
            <span className="text-slate-500">{t('booking.earliestAvailable')}: </span>
            <span className="font-medium">
              {fmtDayLong.format(new Date(earliest.data.start))} ·{' '}
              {fmtTime.format(new Date(earliest.data.start))}
            </span>
          </span>
          <Button type="button" variant="secondary" onClick={pickEarliest}>
            {t('booking.bookEarliest')}
          </Button>
        </div>
      ) : null}

      {/* Quick-jump chips — covers the common targets users type into search. */}
      <div className="flex flex-wrap items-center gap-2">
        <JumpChip label={t('booking.jump.today')} onClick={() => jump(0)} active={isOnFirstWindow} />
        <JumpChip label={t('booking.jump.tomorrow')} onClick={() => jump(1)} />
        <JumpChip label={t('booking.jump.nextWeek')} onClick={() => jump(7)} />
        <JumpChip label={t('booking.jump.in1mo')} onClick={() => jump(30)} />
        <JumpChip label={t('booking.jump.in3mo')} onClick={() => jump(90)} />
        <label className="ml-auto flex items-center gap-1">
          <span className="text-xs text-slate-500">{t('booking.pickDate')}</span>
          <input
            type="date"
            aria-label={t('booking.pickDate')}
            min={formatLocalDateInput(new Date())}
            max={formatLocalDateInput(addDays(new Date(), MAX_HORIZON_DAYS))}
            value={formatLocalDateInput(windowStart)}
            onChange={(e) => jumpToDateString(e.target.value)}
            className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {/* Window header + paging arrows. */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {fmtDay.format(windowStart)} – {fmtDay.format(addDays(windowEnd, -1))}
        </span>
        <div className="flex items-center gap-3">
          {!isOnFirstWindow ? (
            <button
              type="button"
              onClick={() => setWindowStart(addDays(windowStart, -daysPerPage))}
              className="hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← {t('booking.prevDays', { count: daysPerPage })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, daysPerPage))}
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            {t('booking.nextDays', { count: daysPerPage })} →
          </button>
        </div>
      </div>

      {/* Slot grid — scrollable, fills all remaining vertical space. */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
        {q.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
            <Spinner size="sm" /> {t('common.loading')}
          </div>
        ) : q.error ? (
          <div className="p-3">
            <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
          </div>
        ) : byDay.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            {t('booking.noSlots')}
          </div>
        ) : (
          <ul className="space-y-4 p-3">
            {byDay.map(([dayKey, slots]) => {
              const dayDate = new Date(dayKey + 'T00:00:00Z');
              const groups = groupByPartOfDay(slots);
              return (
                <li key={dayKey}>
                  <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {fmtDay.format(dayDate)}
                  </p>
                  <div className="space-y-2">
                    {groups.map(([partKey, partSlots]) =>
                      partSlots.length === 0 ? null : (
                        <div key={partKey}>
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                            {t(`booking.partOfDay.${partKey}`)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {partSlots.map((s) => {
                              const active = value.has(s.start);
                              return (
                                <button
                                  key={s.start}
                                  type="button"
                                  onClick={() => onChange(s.start)}
                                  aria-pressed={active}
                                  className={[
                                    'rounded-lg border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                    active
                                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                                      : 'border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600',
                                  ].join(' ')}
                                >
                                  {fmtTime.format(new Date(s.start))}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cap warning — fires when the raw API response hit the 200-slot ceiling. */}
      {(q.data?.length ?? 0) >= 200 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Showing the first 200 available slots. Choose a later start date or increase the duration to see more.
        </p>
      ) : null}
    </div>
  );
}

interface JumpChipProps {
  label: string;
  onClick: () => void;
  active?: boolean;
}

function JumpChip({ label, onClick, active }: JumpChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={[
        'rounded-full border px-3 py-1 text-xs transition',
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
          : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-800 dark:text-slate-300',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function groupByDay(slots: FreeSlot[]): [string, FreeSlot[]][] {
  const map = new Map<string, FreeSlot[]>();
  for (const s of slots) {
    const dayKey = s.start.slice(0, 10); // 2026-05-07
    const arr = map.get(dayKey) ?? [];
    arr.push(s);
    map.set(dayKey, arr);
  }
  return [...map.entries()];
}

type PartOfDay = 'morning' | 'afternoon' | 'evening';

/**
 * Bucket a day's slots into morning (< 12), afternoon (12–17), evening (>= 17),
 * keyed off the LOCAL hour (which is what the owner reads off the chip). This
 * means a 14:00 UTC slot in EST renders under "morning"; that matches the
 * formatted time the chip displays.
 */
function groupByPartOfDay(slots: FreeSlot[]): [PartOfDay, FreeSlot[]][] {
  const groups: Record<PartOfDay, FreeSlot[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const s of slots) {
    const h = new Date(s.start).getHours();
    if (h < 12) groups.morning.push(s);
    else if (h < 17) groups.afternoon.push(s);
    else groups.evening.push(s);
  }
  return [
    ['morning', groups.morning],
    ['afternoon', groups.afternoon],
    ['evening', groups.evening],
  ];
}
