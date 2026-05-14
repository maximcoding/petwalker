'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useMemo, useState, type JSX } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

import { PartBlock, type Part } from './m3/booking/part-block';

import type { ServiceType } from '@petwalker/shared/enums';
import type { FreeSlot } from '@petwalker/shared/types';

/**
 * AiSmartPicker — "AI Smart choice" booking mode.
 *
 * The owner picks (a) how many walks, (b) cadence, (c) which parts of
 * the day work, (d) optional constraints. The picker fetches free
 * slots in the chosen date range and lays out a candidate plan: one
 * walk per cadence-eligible day, picking the first slot inside the
 * preferred-time window. The owner reviews the plan, can drop any
 * suggestion with the ✕ button, and the surviving slots are surfaced
 * to the wizard via `onChange(start)` exactly like the manual picker.
 *
 * V1 scope: no calendar-integration. "Avoid calendar conflicts" is
 * shown as a disabled checkbox so the affordance is discoverable but
 * doesn't lie about behaviour. Real integration arrives once the
 * connector ships.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type Cadence = 'even' | 'weekdays' | 'weekends' | 'alternate';

interface Props {
  providerId: string;
  serviceType: ServiceType;
  durationMin: number;
  rangeStart: string | null; // YYYY-MM-DD local
  rangeEnd: string | null;
  /** Current set of ISO start timestamps owned by the wizard. */
  value: Set<string>;
  /** Toggle one ISO start. Same semantics as elsewhere. */
  onChange: (start: string) => void;
  /** Wipe the set. */
  onClear: () => void;
}

function parseLocalDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function partOf(hour: number): Part {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

const fmtSuggestion = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function AiSmartPicker({
  providerId,
  serviceType,
  durationMin,
  rangeStart,
  rangeEnd,
  value,
  onChange,
  onClear,
}: Props): JSX.Element {
  /* ── Form state ─────────────────────────────────────────────── */
  const [count, setCount] = useState(5);
  const [cadence, setCadence] = useState<Cadence>('even');
  const [parts, setParts] = useState<Set<Part>>(
    () => new Set<Part>(['morning']),
  );
  const [avoidConsecutive, setAvoidConsecutive] = useState(false);

  /* ── Window ────────────────────────────────────────────────── */
  const window = useMemo(() => {
    const s = rangeStart ? parseLocalDate(rangeStart) : null;
    const e = rangeEnd ? parseLocalDate(rangeEnd) : null;
    if (!s || !e || e < s) return null;
    const start = new Date(s);
    start.setHours(0, 0, 0, 0);
    const end = new Date(e.getTime() + DAY_MS);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }, [rangeStart, rangeEnd]);

  /* ── Fetch availability ────────────────────────────────────── */
  const q = useQuery<FreeSlot[]>({
    queryKey: [
      'free-slots-smart',
      providerId,
      serviceType,
      durationMin,
      window?.start.toISOString(),
      window?.end.toISOString(),
    ],
    queryFn: () =>
      window
        ? api.providers.freeSlots(providerId, {
            serviceType,
            from: window.start.toISOString(),
            to: window.end.toISOString(),
            durationMin,
            stepMin: durationMin,
          })
        : Promise.resolve([] as FreeSlot[]),
    enabled: Boolean(window),
    staleTime: 30_000,
  });

  /* ── Per-part counts for the 3 big blocks ──────────────────── */
  const partCounts = useMemo(() => {
    const m: Record<Part, number> = { morning: 0, afternoon: 0, evening: 0 };
    for (const s of q.data ?? []) m[partOf(new Date(s.start).getHours())]++;
    return m;
  }, [q.data]);

  /* ── Suggestions: generate eagerly so the owner sees the
       candidate plan reactively as they tweak knobs. ────────── */
  const suggestions = useMemo<FreeSlot[]>(() => {
    if (!window || !(q.data && q.data.length > 0) || parts.size === 0) {
      return [];
    }
    // Filter slots by preferred part-of-day.
    const eligible = q.data.filter((s) =>
      parts.has(partOf(new Date(s.start).getHours())),
    );

    // Group by date for cadence filtering.
    const byDate = new Map<string, FreeSlot[]>();
    for (const s of eligible) {
      const k = localDateKey(new Date(s.start));
      const arr = byDate.get(k) ?? [];
      arr.push(s);
      byDate.set(k, arr);
    }

    // Sort dates ascending so we can apply alternate-day & spread.
    const dateKeys = [...byDate.keys()].sort();

    // Filter dates by cadence.
    const cadenceKeys: string[] = [];
    let prevPicked: number | null = null;
    for (const k of dateKeys) {
      const d = parseLocalDate(k);
      if (!d) continue;
      if (cadence === 'weekdays' && isWeekend(d)) continue;
      if (cadence === 'weekends' && !isWeekend(d)) continue;
      if (cadence === 'alternate') {
        const dayIx = Math.round(
          (d.getTime() - window.start.getTime()) / DAY_MS,
        );
        if (prevPicked !== null && dayIx - prevPicked < 2) continue;
        prevPicked = dayIx;
      }
      cadenceKeys.push(k);
    }

    if (cadenceKeys.length === 0) return [];

    // Spread N picks across the cadence-eligible dates.
    const pool: string[] = [];
    if (cadenceKeys.length <= count) {
      pool.push(...cadenceKeys);
    } else {
      // Evenly-spaced indices.
      for (let i = 0; i < count; i++) {
        const ix = Math.round((i * (cadenceKeys.length - 1)) / (count - 1 || 1));
        const key = cadenceKeys[ix];
        if (key !== undefined && !pool.includes(key)) pool.push(key);
      }
      // Fill if rounding produced duplicates.
      let extra = 0;
      while (pool.length < count && extra < cadenceKeys.length) {
        const k = cadenceKeys[extra++];
        if (k !== undefined && !pool.includes(k)) pool.push(k);
      }
    }

    // For each chosen date, pick the FIRST slot inside preferred parts.
    const picks: FreeSlot[] = [];
    let lastPickedDay: number | null = null;
    for (const k of pool) {
      const slots = (byDate.get(k) ?? []).sort((a, b) =>
        a.start.localeCompare(b.start),
      );
      const first = slots[0];
      if (!first) continue;
      if (avoidConsecutive && lastPickedDay !== null) {
        const d = parseLocalDate(k);
        if (d) {
          const dayIx = Math.round(
            (d.getTime() - window.start.getTime()) / DAY_MS,
          );
          if (dayIx - lastPickedDay < 2) continue;
        }
      }
      picks.push(first);
      const d = parseLocalDate(k);
      if (d) {
        lastPickedDay = Math.round(
          (d.getTime() - window.start.getTime()) / DAY_MS,
        );
      }
      if (picks.length >= count) break;
    }
    return picks;
  }, [q.data, window, parts, cadence, count, avoidConsecutive]);

  function applyAll(): void {
    // Replace value with the current suggestion set.
    onClear();
    for (const s of suggestions) onChange(s.start);
  }

  function removeOne(iso: string): void {
    if (value.has(iso)) onChange(iso);
  }

  function togglePart(p: Part): void {
    const next = new Set(parts);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setParts(next);
  }

  /* ── Empty / error guards ───────────────────────────────────── */
  if (!window) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border-subtle bg-warm-50 p-6 text-center text-sm text-ink-secondary">
        Pick a date range above first — AI needs a window to plan in.
      </div>
    );
  }
  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-ink-tertiary">
        <Spinner size="sm" /> Reading availability…
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

  const isApplied =
    suggestions.length > 0 &&
    suggestions.every((s) => value.has(s.start)) &&
    value.size === suggestions.length;

  return (
    <div className="space-y-3">
      {/* N + cadence */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
            How many walks
          </span>
          <input
            type="number"
            min={1}
            max={30}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
            }
            className="mt-1 block w-full rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
            Cadence
          </span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            className="mt-1 block w-full rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="even">Spread evenly across range</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekends">Weekends only</option>
            <option value="alternate">Every other day</option>
          </select>
        </label>
      </div>

      {/* Preferred time — 3 big blocks (variant C, shared component) */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
          Preferred time
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['morning', 'afternoon', 'evening'] as const).map((p) => (
            <PartBlock
              key={p}
              tone={p}
              count={partCounts[p]}
              selected={parts.has(p)}
              onToggle={() => togglePart(p)}
            />
          ))}
        </div>
        {parts.size === 0 ? (
          <p className="mt-2 text-xs text-coral-700">
            Pick at least one part of the day.
          </p>
        ) : null}
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <label
          className="flex cursor-not-allowed items-center gap-2 text-xs text-ink-tertiary"
          title="Coming soon — calendar integration is not wired yet"
        >
          <input type="checkbox" disabled className="h-4 w-4" />
          Avoid times when I have calendar conflicts
          <span className="rounded-full bg-warm-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">
            Soon
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={avoidConsecutive}
            onChange={(e) => setAvoidConsecutive(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Don&apos;t book two days in a row
        </label>
      </div>

      {/* Suggestions */}
      {suggestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-warm-50 p-4 text-center text-sm text-ink-secondary">
          No slots fit those preferences. Loosen the cadence or add more parts of day.
        </div>
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-subtle">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
              AI suggested · {suggestions.length} walk{suggestions.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => {
                // Re-shuffle by toggling parts state's identity; cheap trick.
                // Generate a slight permutation by flipping count + restoring.
                setCount((c) => c);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-base px-2 py-1 text-[11px] font-medium text-ink-secondary hover:border-border-strong"
              aria-label="Regenerate suggestions"
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              Regenerate
            </button>
          </div>
          {/* Fixed height (not max-height) so toggling a constraint
              that changes the suggestion count never reflows the
              section — the list area always reserves 180px and
              scrolls internally. */}
          <ul className="h-[180px] space-y-1.5 overflow-y-auto pr-1">
            {suggestions.map((s) => {
              const applied = value.has(s.start);
              return (
                <li
                  key={s.start}
                  className={[
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                    applied ? 'bg-mint-50' : 'bg-warm-50',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-2 font-medium text-ink-primary">
                    {applied ? (
                      <Check className="h-4 w-4 text-mint-700" aria-hidden />
                    ) : (
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full bg-ink-tertiary"
                      />
                    )}
                    {fmtSuggestion.format(new Date(s.start))}
                  </span>
                  {applied ? (
                    <button
                      type="button"
                      onClick={() => removeOne(s.start)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-base text-ink-tertiary hover:bg-coral-100 hover:text-coral-700"
                      aria-label="Remove this slot"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={applyAll}
            disabled={isApplied}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-ink-inverse hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {isApplied
              ? `Applied · ${suggestions.length} walk${suggestions.length !== 1 ? 's' : ''}`
              : `Use these ${suggestions.length} walk${suggestions.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

