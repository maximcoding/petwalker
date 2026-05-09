'use client';

import { useState } from 'react';

interface Props {
  /** Called when both dates + time are set. Emits ISO start string and duration in minutes. */
  onChange: (isoStart: string, durationMin: number) => void;
  onClear: () => void;
  /** Currently confirmed selection, null if none. */
  value: { isoStart: string; durationMin: number } | null;
}

const CHECK_IN_TIMES = [
  { label: 'Morning', hour: 8 },
  { label: 'Noon', hour: 12 },
  { label: 'Afternoon', hour: 15 },
  { label: 'Evening', hour: 18 },
] as const;

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDays(min: number): string {
  const d = min / 1440;
  return `${d} day${d !== 1 ? 's' : ''}`;
}

export function DateRangePicker({ onChange, onClear, value }: Props): JSX.Element {
  const today = toLocalDateStr(new Date());
  const [checkInDate, setCheckInDate] = useState(value ? toLocalDateStr(new Date(value.isoStart)) : '');
  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (!value) return '';
    const end = new Date(new Date(value.isoStart).getTime() + value.durationMin * 60_000);
    return toLocalDateStr(end);
  });
  const [checkInHour, setCheckInHour] = useState(value ? new Date(value.isoStart).getHours() : 8);

  function emit(inDate: string, outDate: string, hour: number): void {
    if (!inDate || !outDate) return;
    const [iy, im, id] = inDate.split('-').map(Number);
    const [oy, om, od] = outDate.split('-').map(Number);
    const start = new Date(iy!, im! - 1, id!, hour, 0, 0, 0);
    const end = new Date(oy!, om! - 1, od!, hour, 0, 0, 0);
    const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
    if (durationMin <= 0) return;
    onChange(start.toISOString(), durationMin);
  }

  function handleInDate(v: string): void {
    setCheckInDate(v);
    // Reset check-out if it's before or equal to new check-in
    if (checkOutDate && checkOutDate <= v) setCheckOutDate('');
    emit(v, checkOutDate, checkInHour);
  }

  function handleOutDate(v: string): void {
    setCheckOutDate(v);
    emit(checkInDate, v, checkInHour);
  }

  function handleHour(h: number): void {
    setCheckInHour(h);
    emit(checkInDate, checkOutDate, h);
  }

  const durationLabel = value ? fmtDays(value.durationMin) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary banner */}
      {value ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-900 dark:bg-brand-950">
          <div>
            <p className="font-medium text-brand-700 dark:text-brand-200">
              {fmtDate(value.isoStart)} → {fmtDate(new Date(new Date(value.isoStart).getTime() + value.durationMin * 60_000).toISOString())}
            </p>
            <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">
              {durationLabel} · check-in at {new Date(value.isoStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <button type="button" onClick={() => { onClear(); setCheckInDate(''); setCheckOutDate(''); }} className="ml-4 text-xs text-brand-600 underline hover:no-underline dark:text-brand-300">
            Clear
          </button>
        </div>
      ) : null}

      {/* Date inputs side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Check-in</label>
          <input
            type="date"
            min={today}
            value={checkInDate}
            onChange={(e) => handleInDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Check-out</label>
          <input
            type="date"
            min={checkInDate || today}
            value={checkOutDate}
            onChange={(e) => handleOutDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Duration derived label */}
      {durationLabel ? (
        <p className="text-sm text-slate-500">{durationLabel}</p>
      ) : null}

      {/* Check-in time */}
      <div>
        <p className="mb-1.5 text-sm font-medium">Check-in time</p>
        <div className="flex flex-wrap gap-2">
          {CHECK_IN_TIMES.map(({ label, hour }) => (
            <button
              key={hour}
              type="button"
              aria-pressed={checkInHour === hour}
              onClick={() => handleHour(hour)}
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
    </div>
  );
}
