'use client';

import { useMemo, useState } from 'react';

interface Props {
  /** Duration in minutes — determines check-out date. Must be ≥ 1440. */
  durationMin: number;
  /** ISO UTC string of the selected check-in, or null if none selected. */
  value: string | null;
  onChange: (isoStart: string) => void;
  onClear: () => void;
}

const CHECK_IN_TIMES = [
  { label: 'Morning', hour: 8 },
  { label: 'Noon', hour: 12 },
  { label: 'Afternoon', hour: 15 },
  { label: 'Evening', hour: 18 },
] as const;

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function DateRangePicker({ durationMin, value, onChange, onClear }: Props): JSX.Element {
  const today = formatLocalDate(new Date());
  const [checkInHour, setCheckInHour] = useState(8);

  const durationDays = Math.round(durationMin / 1440);

  const checkOutDisplay = useMemo(() => {
    if (!value) return null;
    const end = new Date(new Date(value).getTime() + durationMin * 60_000);
    return fmtDisplay(end.toISOString());
  }, [value, durationMin]);

  function handleDateChange(dateStr: string): void {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    // Build local midnight then shift to the chosen check-in hour
    const local = new Date(y!, m! - 1, d!, checkInHour, 0, 0, 0);
    onChange(local.toISOString());
  }

  function handleHourChange(hour: number): void {
    setCheckInHour(hour);
    if (!value) return;
    // Re-emit with the same date but new hour
    const prev = new Date(value);
    const updated = new Date(
      prev.getFullYear(), prev.getMonth(), prev.getDate(), hour, 0, 0, 0,
    );
    onChange(updated.toISOString());
  }

  const selectedDateStr = value ? formatLocalDate(new Date(value)) : '';

  return (
    <div className="flex flex-col gap-4">
      {/* Selected range summary */}
      {value ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-900 dark:bg-brand-950">
          <div>
            <p className="font-medium text-brand-700 dark:text-brand-200">
              {fmtDisplay(value)} → {checkOutDisplay}
            </p>
            <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">
              {durationDays} day{durationDays !== 1 ? 's' : ''} · check-in at {new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ml-4 text-xs text-brand-600 underline hover:no-underline dark:text-brand-300"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Check-in date */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Check-in date</label>
        <input
          type="date"
          min={today}
          value={selectedDateStr}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* Check-in time */}
      <div>
        <p className="mb-1.5 text-sm font-medium">Check-in time</p>
        <div className="flex flex-wrap gap-2">
          {CHECK_IN_TIMES.map(({ label, hour }) => (
            <button
              key={hour}
              type="button"
              aria-pressed={checkInHour === hour}
              onClick={() => handleHourChange(hour)}
              className={[
                'rounded-full border px-3 py-1 text-sm transition',
                checkInHour === hour
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Check-out preview */}
      {value ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500">Check-out</p>
          <p className="mt-0.5 font-medium">{checkOutDisplay}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
          Pick a check-in date to see the check-out date.
        </div>
      )}
    </div>
  );
}
