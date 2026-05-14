'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Calendar, Check, Clock } from 'lucide-react';
import { useEffect, useMemo, useState, type JSX } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

import { PartBlock, type Part } from './m3/booking/part-block';

import type { ServiceType } from '@petwalker/shared/enums';
import type { FreeSlot } from '@petwalker/shared/types';

/**
 * DateThenTimePicker — 2-phase booking time selector, per-date.
 *
 *   Phase 1: pick dates one at a time. Each date becomes "active"
 *            when selected; Phase 2 below shows ONLY that date's
 *            hour options. Picking a different date switches focus.
 *
 *   Phase 2: pick one or more hours for the ACTIVE date. Each date's
 *            hour selection is independent — Wed-morning + Thu-evening
 *            now compose cleanly.
 *
 * **Validation** (added 2026-05-13 per Maxim):
 *   You cannot add another date while any currently-selected date has
 *   zero hours picked. The next date chip is disabled with a hint,
 *   forcing the owner to either fill the open date or unselect it.
 *
 * API contract for the parent is unchanged: `value` Set of ISO
 * timestamps, `onChange(start)` toggles one slot, `onClear()` wipes.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_DAYS = 14;

interface Props {
  providerId: string;
  serviceType: ServiceType;
  durationMin: number;
  value: Set<string>;
  onChange: (start: string) => void;
  onClear: () => void;
  /** Optional range scope — ISO date strings YYYY-MM-DD. When set,
   *  the day-strip only contains dates inside [start, end]. */
  rangeStart?: string | null;
  rangeEnd?: string | null;
}

const PART_TONE: Record<Part, string> = {
  morning: 'bg-sunshine-100 text-sunshine-800',
  afternoon: 'bg-peach-100 text-peach-800',
  evening: 'bg-lavender-100 text-lavender-800',
};

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseLocalDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

function partOfDay(hour: number): Part {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const fmtDayChip = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

const fmtHour = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

export function DateThenTimePicker({
  providerId,
  serviceType,
  durationMin,
  value,
  onChange,
  onClear,
  rangeStart,
  rangeEnd,
}: Props): JSX.Element {
  // Compute the window. If a caller-provided range exists, honour it;
  // otherwise fall back to a stable 14-day window from today.
  const window = useMemo(() => {
    if (rangeStart && rangeEnd) {
      const s = parseLocalDate(rangeStart);
      const e = parseLocalDate(rangeEnd);
      if (s && e && e >= s) {
        const start = new Date(s);
        start.setHours(0, 0, 0, 0);
        // Add a day to end so the to-bound is exclusive but covers
        // the entire last day.
        const end = new Date(e.getTime() + DAY_MS);
        end.setHours(0, 0, 0, 0);
        return { start, end };
      }
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + FALLBACK_DAYS * DAY_MS);
    return { start, end };
  }, [rangeStart, rangeEnd]);

  const q = useQuery<FreeSlot[]>({
    queryKey: [
      'free-slots-date-first',
      providerId,
      serviceType,
      durationMin,
      window.start.toISOString(),
      window.end.toISOString(),
    ],
    queryFn: () =>
      api.providers.freeSlots(providerId, {
        serviceType,
        from: window.start.toISOString(),
        to: window.end.toISOString(),
        durationMin,
        stepMin: durationMin,
      }),
    staleTime: 30_000,
  });

  const slotsByDate = useMemo(() => {
    const m = new Map<string, FreeSlot[]>();
    for (const s of q.data ?? []) {
      const key = localDateKey(new Date(s.start));
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [q.data]);

  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => {
    const out = new Set<string>();
    for (const iso of value) out.add(localDateKey(new Date(iso)));
    return out;
  });

  // The currently focused date — Phase 2 hours apply to this one only.
  const [activeDate, setActiveDate] = useState<string | null>(() => {
    const first = [...value].sort()[0];
    return first ? localDateKey(new Date(first)) : null;
  });

  // Multi-select part-of-day filter — kept PER DATE. Each selected
  // date carries its own Morning/Afternoon/Evening choice, so
  // switching the active date shows that date's own filter (Wed can
  // be Mornings while Thu is Evenings). Empty set = "show all hours".
  const [partsByDate, setPartsByDate] = useState<Map<string, Set<Part>>>(
    new Map(),
  );

  // The active date's own part-of-day filter (empty when none).
  const activeParts: Set<Part> = activeDate
    ? partsByDate.get(activeDate) ?? new Set<Part>()
    : new Set<Part>();

  function togglePart(p: Part): void {
    if (!activeDate) return;
    setPartsByDate((prev) => {
      const next = new Map(prev);
      const cur = new Set(next.get(activeDate) ?? new Set<Part>());
      if (cur.has(p)) cur.delete(p);
      else cur.add(p);
      next.set(activeDate, cur);
      return next;
    });
  }

  /** Slots from `value` that fall on a given date key. */
  function slotsOnDate(dateKey: string): string[] {
    const out: string[] = [];
    for (const iso of value) {
      if (localDateKey(new Date(iso)) === dateKey) out.push(iso);
    }
    return out;
  }

  /** Dates the owner has selected but hasn't yet picked any hour for. */
  const incompleteDates = useMemo(() => {
    const out = new Set<string>();
    for (const dk of selectedDates) {
      if (slotsOnDate(dk).length === 0) out.add(dk);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDates, value]);

  const blockNewDate = incompleteDates.size > 0;

  // If the active date got cleared externally (e.g., wizard cleared
  // all slots), or the user removed it, fall back to the first
  // remaining selected date.
  useEffect(() => {
    if (activeDate && !selectedDates.has(activeDate)) {
      const first = [...selectedDates].sort()[0] ?? null;
      setActiveDate(first);
    }
  }, [activeDate, selectedDates]);

  const days = useMemo(() => {
    const out: { dateKey: string; date: Date; slotCount: number }[] = [];
    const dayCount = Math.max(
      1,
      Math.round((window.end.getTime() - window.start.getTime()) / DAY_MS),
    );
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(window.start.getTime() + i * DAY_MS);
      const dateKey = localDateKey(date);
      out.push({
        dateKey,
        date,
        slotCount: slotsByDate.get(dateKey)?.length ?? 0,
      });
    }
    return out;
  }, [slotsByDate, window]);

  // Hour pool for the ACTIVE date only — per-date independence.
  const hoursPool = useMemo(() => {
    if (!activeDate) return [] as number[];
    const set = new Set<number>();
    for (const s of slotsByDate.get(activeDate) ?? []) set.add(hourOf(s.start));
    return [...set].sort((a, b) => a - b);
  }, [activeDate, slotsByDate]);

  // Per-part counts for the active date's hour pool.
  const partCounts = useMemo(() => {
    const m: Record<Part, number> = { morning: 0, afternoon: 0, evening: 0 };
    for (const h of hoursPool) m[partOfDay(h)]++;
    return m;
  }, [hoursPool]);

  function clickDate(dateKey: string): void {
    // Already-selected date.
    if (selectedDates.has(dateKey)) {
      if (activeDate === dateKey) {
        // Second tap on the active one → unselect entirely.
        for (const iso of slotsOnDate(dateKey)) onChange(iso);
        const next = new Set(selectedDates);
        next.delete(dateKey);
        setSelectedDates(next);
        // Drop this date's part-of-day filter too.
        setPartsByDate((prev) => {
          if (!prev.has(dateKey)) return prev;
          const m = new Map(prev);
          m.delete(dateKey);
          return m;
        });
        // activeDate falls back via the effect.
      } else {
        // Tap on a different already-picked date → just focus it.
        setActiveDate(dateKey);
      }
      return;
    }
    // New date — gated by the "no dangling empty dates" rule.
    if (blockNewDate) return;
    const next = new Set(selectedDates);
    next.add(dateKey);
    setSelectedDates(next);
    setActiveDate(dateKey);
  }

  function toggleHour(hour: number): void {
    if (!activeDate) return;
    const slot = (slotsByDate.get(activeDate) ?? []).find(
      (s) => hourOf(s.start) === hour,
    );
    if (!slot) return;
    onChange(slot.start);
  }

  const isHourSelected = (hour: number): boolean => {
    if (!activeDate) return false;
    const slot = (slotsByDate.get(activeDate) ?? []).find(
      (s) => hourOf(s.start) === hour,
    );
    if (!slot) return false;
    return value.has(slot.start);
  };

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-ink-tertiary">
        <Spinner size="sm" /> Loading availability…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="p-3">
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      </div>
    );
  }

  // Empty filter = no restriction; otherwise show only hours whose
  // part-of-day is in the ACTIVE DATE's own selected set.
  const visibleHours =
    activeParts.size === 0
      ? hoursPool
      : hoursPool.filter((h) => activeParts.has(partOfDay(h)));

  return (
    <div className="space-y-5">
      <div>
        {/* Header row: "1. Pick days" label + inline validation hint
            on the SAME line. The hint slot is always present so
            toggling it never reflows the date strip. */}
        <div className="mb-2 flex min-h-[18px] flex-wrap items-center gap-x-3 gap-y-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            1. Pick days
          </p>
          {blockNewDate ? (
            <p className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-coral-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Pick a time for the open day first
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {days.map(({ dateKey, date, slotCount }) => {
            const sel = selectedDates.has(dateKey);
            const isActive = activeDate === dateKey;
            const isIncomplete = sel && incompleteDates.has(dateKey);
            const pickedHere = slotsOnDate(dateKey).length;
            // Non-selected dates are disabled when the rule is "fill
            // the current open date first". A date that already has
            // 0 availability is also disabled.
            const disabledByRule = !sel && blockNewDate;
            const disabledByEmpty = slotCount === 0;
            const disabled = disabledByRule || disabledByEmpty;

            let cls: string;
            if (isActive) {
              cls = 'border-brand-700 bg-brand-600 text-ink-inverse ring-2 ring-brand-300 ring-offset-2';
            } else if (isIncomplete) {
              cls = 'border-coral-400 bg-coral-50 text-coral-700';
            } else if (sel) {
              cls = 'border-brand-600 bg-brand-600 text-ink-inverse';
            } else if (disabledByEmpty) {
              cls = 'cursor-not-allowed border-border-subtle bg-surface-base text-ink-tertiary opacity-50';
            } else if (disabledByRule) {
              cls = 'cursor-not-allowed border-border-subtle bg-surface-base text-ink-tertiary opacity-40';
            } else {
              cls = 'border-border-subtle bg-surface-raised text-ink-primary hover:border-brand-400';
            }

            return (
              <button
                key={dateKey}
                type="button"
                disabled={disabled}
                onClick={() => clickDate(dateKey)}
                aria-pressed={sel}
                aria-current={isActive ? 'date' : undefined}
                title={
                  disabledByRule
                    ? 'Pick a time for the open date first'
                    : undefined
                }
                /* Fixed width AND fixed height so the chip never
                   resizes when its status text transitions between
                   "needs time", "N picked", and "N slots". This
                   eliminates the jumpiness Maxim flagged
                   2026-05-13. */
                className={[
                  'inline-flex h-[68px] w-[82px] flex-col items-center justify-between rounded-2xl border-2 px-2 py-1.5 text-xs transition-colors',
                  cls,
                ].join(' ')}
              >
                <span className="font-semibold uppercase leading-none tracking-wider">
                  {fmtDayChip.format(date)}
                </span>
                <span className="text-base font-extrabold leading-none">
                  {date.getDate()}
                </span>
                {/* Fixed-height status line, centred — same vertical
                    footprint for every state so swapping content
                    never reflows the chip. */}
                <span
                  className={[
                    'flex h-4 w-full items-center justify-center gap-0.5 text-[10px] font-medium leading-none',
                    sel ? 'text-ink-inverse/85' : '',
                    isIncomplete && !isActive ? 'text-coral-700' : '',
                    !sel && !disabled ? 'text-ink-tertiary' : '',
                  ].join(' ')}
                >
                  {disabledByEmpty ? (
                    'none'
                  ) : sel ? (
                    /* Selected dates (complete OR incomplete) show a
                       consistent "N picked" — inherits the chip's own
                       text colour, so it's always legible. The
                       separate inline hint by "PICK DAYS" already
                       tells the owner to fill an open day. */
                    <span>{pickedHere} picked</span>
                  ) : (
                    <span>{slotCount} slots</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase 2 is ALWAYS rendered — never swapped for a small
          placeholder. Before a date is picked the PartBlocks just
          show count 0 (disabled) and the hour area shows a hint.
          Keeping the structure mounted means picking the first date
          fills the existing layout instead of expanding it, so the
          UI doesn't shift. */}
      <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            2. Pick time
            {activeDate ? (
              <span className="ms-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                {(() => {
                  const d = (() => {
                    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(activeDate);
                    return m
                      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
                      : null;
                  })();
                  return d
                    ? `${fmtDayChip.format(d)} ${d.getDate()}`
                    : '';
                })()}
              </span>
            ) : null}
          </p>

          {/* Time-of-day filter — same PartBlock design as the AI
              Smart picker. Empty selection = show every hour. Each
              block's count = unique hours of that part-of-day across
              the selected dates. */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(['morning', 'afternoon', 'evening'] as const).map((p) => (
              <PartBlock
                key={p}
                tone={p}
                count={partCounts[p]}
                selected={activeParts.has(p)}
                onToggle={() => togglePart(p)}
                unit="hours"
              />
            ))}
          </div>

          {/* Fixed min-height so the hour-chip grid and the
              empty/placeholder states all occupy the same vertical
              space — selecting a day fills this reserved area
              instead of expanding the picker. */}
          <div className="min-h-[160px]">
          {selectedDates.size === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border-subtle bg-warm-50 p-4 text-center text-sm text-ink-secondary">
              Pick a day above to choose a time.
            </p>
          ) : visibleHours.length === 0 ? (
            <p className="rounded-xl bg-warm-50 p-4 text-center text-sm text-ink-tertiary">
              No matching slots across the selected days.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleHours.map((h) => {
                const sel = isHourSelected(h);
                const sample = new Date();
                sample.setHours(h, 0, 0, 0);
                const tone = PART_TONE[partOfDay(h)];
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => toggleHour(h)}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-colors',
                      sel
                        ? 'border-brand-600 bg-brand-600 text-ink-inverse'
                        : 'border-border-subtle bg-surface-raised text-ink-primary hover:border-brand-400',
                    ].join(' ')}
                  >
                    {/* Fixed-size indicator box — same 14×14 footprint
                        whether it shows a check (selected) or a tone
                        dot (idle), so toggling a chip never changes
                        its width and never reflows the row. */}
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {sel ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className={`inline-block h-2 w-2 rounded-full ${tone.split(' ')[0]}`}
                        />
                      )}
                    </span>
                    {fmtHour.format(sample)}
                  </button>
                );
              })}
            </div>
          )}
          </div>

          {/* Always-rendered fixed-height slot for the selection
              summary. The chip toggles inside, but the container
              keeps its height whether or not a slot is picked — so
              selecting the FIRST time never grows the picker and
              never makes a scrollbar appear. */}
          <div className="mt-4 flex min-h-[40px] items-center">
            {value.size > 0 ? (
              <div className="flex w-full items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm">
                <span className="font-semibold text-brand-700">
                  ✓ {value.size} slot{value.size !== 1 ? 's' : ''} across{' '}
                  {selectedDates.size - incompleteDates.size} day
                  {selectedDates.size - incompleteDates.size !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setSelectedDates(new Set());
                    setActiveDate(null);
                    setPartsByDate(new Map());
                  }}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>
      </div>
    </div>
  );
}
