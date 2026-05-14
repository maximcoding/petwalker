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
      {/* The earlier "✓ N slot(s) selected" chip lived here. Removed
          because it conditionally added a row to the picker, making
          the entire layout jump every time the user tapped a slot.
          The wizard's sticky bottom footer already shows the count
          and live price ("{slotCount} slots · $X") so no info is
          lost. Clear-all action is available via re-tapping selected
          slots; we can add a small inline "Clear" link next to the
          earliest-available row later if users actually ask. */}

      {/* Earliest-available callout — silent if no slots in next 90 days.
          Mint tokens match the rest of the booking-wizard palette. */}
      {earliest.data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3 text-sm">
          <span>
            <span className="text-ink-secondary">{t('booking.earliestAvailable')}: </span>
            <span className="font-semibold text-mint-800">
              {fmtDayLong.format(new Date(earliest.data.start))} ·{' '}
              {fmtTime.format(new Date(earliest.data.start))}
            </span>
          </span>
          <Button type="button" variant="secondary" onClick={pickEarliest}>
            {t('booking.bookEarliest')}
          </Button>
        </div>
      ) : null}

      {/* Quick-jump chips */}
      <div className="flex flex-wrap items-center gap-2">
        <JumpChip label={t('booking.jump.today')} onClick={() => jump(0)} active={isOnFirstWindow} />
        <JumpChip label={t('booking.jump.tomorrow')} onClick={() => jump(1)} />
        <JumpChip label={t('booking.jump.nextWeek')} onClick={() => jump(7)} />
        <JumpChip label={t('booking.jump.in1mo')} onClick={() => jump(30)} />
        <JumpChip label={t('booking.jump.in3mo')} onClick={() => jump(90)} />
        <label className="ms-auto flex items-center gap-2">
          <span className="text-xs text-ink-tertiary">{t('booking.pickDate')}</span>
          <input
            type="date"
            aria-label={t('booking.pickDate')}
            min={formatLocalDateInput(new Date())}
            max={formatLocalDateInput(addDays(new Date(), MAX_HORIZON_DAYS))}
            value={formatLocalDateInput(windowStart)}
            onChange={(e) => jumpToDateString(e.target.value)}
            className="w-36 rounded-lg border border-border-default bg-surface-raised px-2 py-1 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      {/* Window header + paging arrows. */}
      <div className="flex items-center justify-between text-xs text-ink-tertiary">
        <span className="font-medium">
          {fmtDay.format(windowStart)} – {fmtDay.format(addDays(windowEnd, -1))}
        </span>
        <div className="flex items-center gap-3">
          {!isOnFirstWindow ? (
            <button
              type="button"
              onClick={() => setWindowStart(addDays(windowStart, -daysPerPage))}
              className="font-medium hover:text-ink-primary"
            >
              ← {t('booking.prevDays', { count: daysPerPage })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, daysPerPage))}
            className="font-medium hover:text-ink-primary"
          >
            {t('booking.nextDays', { count: daysPerPage })} →
          </button>
        </div>
      </div>

      {/* Slot grid — scrollable, fills all remaining vertical space. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {q.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-ink-tertiary">
            <Spinner size="sm" /> {t('common.loading')}
          </div>
        ) : q.error ? (
          <div className="p-3">
            <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
          </div>
        ) : byDay.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-tertiary">
            {t('booking.noSlots')}
          </div>
        ) : (
          <ul className="space-y-3">
            {byDay.map(([dayKey, slots]) => {
              const dayDate = new Date(dayKey + 'T00:00:00Z');
              const groups = groupByPartOfDay(slots);
              return (
                <li
                  key={dayKey}
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-subtle"
                >
                  {/* Day header — colored pill style, contrasts cleanly
                      against the white card so users can scan dates. */}
                  <div className="flex items-center justify-between gap-2 border-b border-border-subtle bg-warm-50 px-4 py-2">
                    <p className="text-sm font-bold text-ink-primary">
                      {fmtDay.format(dayDate)}
                    </p>
                    <p className="text-[11px] font-medium text-ink-tertiary">
                      {slots.length} slot{slots.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    {groups.map(([partKey, partSlots]) =>
                      partSlots.length === 0 ? null : (
                        <div key={partKey}>
                          <p
                            className={[
                              'mb-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                              PART_TONE[partKey] ?? 'bg-warm-100 text-warm-800',
                            ].join(' ')}
                          >
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
                                    'rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                                    active
                                      ? 'border-brand-600 bg-brand-600 text-ink-inverse shadow-subtle'
                                      : 'border-border-subtle bg-surface-base text-ink-primary hover:border-brand-400 hover:text-brand-700',
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

      {/* Cap warning — sunshine tokens to match the M1 palette. */}
      {(q.data?.length ?? 0) >= 200 ? (
        <p className="rounded-xl border border-sunshine-200 bg-sunshine-50 px-3 py-2 text-xs font-medium text-sunshine-800">
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
        'rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-ink-inverse'
          : 'border-border-subtle bg-surface-raised text-ink-secondary hover:border-border-strong hover:text-ink-primary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/**
 * Tone map for the time-of-day pill — sunshine = morning, peach =
 * afternoon, lavender = evening. Static so Tailwind JIT keeps the
 * classes in the safelist.
 */
const PART_TONE: Record<PartOfDay, string> = {
  morning: 'bg-sunshine-100 text-sunshine-800',
  afternoon: 'bg-peach-100 text-peach-800',
  evening: 'bg-lavender-100 text-lavender-800',
};

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
