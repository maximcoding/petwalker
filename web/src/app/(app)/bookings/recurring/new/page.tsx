'use client';

import type { ServiceProviderDetail } from '@petwalker/shared/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { prettifyError } from '@/lib/prettify-error';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const MAX_TIMES_PER_DAY: Record<string, number> = {
  walking: 4,
  sitting: 3,
  senior_care: 3,
  fitness: 2,
  training: 2,
  grooming: 1,
  boarding: 1,
  daycare: 1,
  photography: 1,
  massage_wellness: 1,
  veterinary: 1,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addWeeksStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function timeInWindow(
  time: string,
  slots: { startTime: string; endTime: string }[],
): boolean {
  if (slots.length === 0) return true;
  return slots.some((s) => time >= s.startTime && time <= s.endTime);
}

function availableDays(availability: { dayOfWeek: number }[]): Set<number> {
  if (availability.length === 0) return new Set([0, 1, 2, 3, 4, 5, 6]);
  return new Set(availability.map((s) => s.dayOfWeek));
}

function slotsForDays(
  availability: { dayOfWeek: number; startTime: string; endTime: string }[],
  days: number[],
): { startTime: string; endTime: string }[] {
  if (availability.length === 0) return [];
  const relevant = availability.filter((s) => days.includes(s.dayOfWeek));
  // De-duplicate by startTime–endTime
  const seen = new Set<string>();
  return relevant.filter((s) => {
    const key = `${s.startTime}–${s.endTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface BlackoutWindow { startDate: string; endDate: string }

function isBlackedOut(dateStr: string, blackouts: BlackoutWindow[]): boolean {
  return blackouts.some((b) => dateStr >= b.startDate && dateStr <= b.endDate);
}

function estimatedSessions(
  startDate: string,
  endDate: string,
  daysOfWeek: number[],
  timesOfDay: string[],
  recurrence: 'weekly' | 'biweekly',
  blackouts: BlackoutWindow[] = [],
): { total: number; skipped: number } {
  if (!startDate || daysOfWeek.length === 0 || timesOfDay.length === 0) {
    return { total: 0, skipped: 0 };
  }
  const end = endDate || addWeeksStr(startDate, 12);
  const start = new Date(startDate + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  let total = 0;
  let skipped = 0;
  let weekIndex = 0;
  const cur = new Date(start);
  while (cur <= endD && total + skipped < 200) {
    const dow = cur.getUTCDay();
    const dateStr = cur.toISOString().slice(0, 10);
    if (daysOfWeek.includes(dow)) {
      if (recurrence === 'weekly' || weekIndex % 2 === 0) {
        if (isBlackedOut(dateStr, blackouts)) {
          skipped += timesOfDay.length;
        } else {
          total += timesOfDay.length;
          if (total >= 52) break;
        }
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (dow === 6) weekIndex++;
  }
  return { total: Math.min(total, 52), skipped };
}

export default function CreateRecurringSeriesPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const providerId = params.get('providerId') ?? '';
  const serviceParam = params.get('service') ?? '';

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const { data: pets = [] } = useQuery({
    queryKey: ['pets'],
    queryFn: () => api.pets.list().then((p) => p.items),
    enabled: !!me,
  });

  const { data: provider } = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: !!providerId,
  });

  const today = todayStr();

  const [form, setForm] = useState({
    petId: '',
    serviceType: serviceParam || 'walking',
    recurrence: 'weekly' as 'weekly' | 'biweekly',
    daysOfWeek: [1] as number[],
    timesOfDay: ['09:00'] as string[],
    startDate: today,
    endDate: '',
    durationMin: 60,
    notes: '',
    addressSource: 'owner_pet' as string,
  });

  const providerAvailability = provider?.availability ?? [];
  const allowedDays = useMemo(() => availableDays(providerAvailability), [providerAvailability]);

  const selectedDaySlots = useMemo(
    () => slotsForDays(providerAvailability, form.daysOfWeek),
    [providerAvailability, form.daysOfWeek],
  );

  const invalidTimes = form.timesOfDay.filter((t) => !timeInWindow(t, selectedDaySlots));
  const hasDuplicateTimes = new Set(form.timesOfDay).size !== form.timesOfDay.length;
  const canSubmit =
    !form.daysOfWeek.some((d) => !allowedDays.has(d)) &&
    invalidTimes.length === 0 &&
    !hasDuplicateTimes &&
    !!form.petId &&
    !!form.startDate &&
    form.daysOfWeek.length > 0 &&
    form.timesOfDay.length > 0;

  const providerBlackouts = provider?.blackouts ?? [];

  const { total: estimatedCount, skipped: skippedCount } = useMemo(
    () =>
      estimatedSessions(
        form.startDate,
        form.endDate,
        form.daysOfWeek,
        form.timesOfDay,
        form.recurrence,
        providerBlackouts,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.startDate, form.endDate, form.daysOfWeek, form.timesOfDay, form.recurrence, providerBlackouts],
  );

  const providerOffering = provider?.offerings.find(
    (o) => o.serviceType === form.serviceType,
  );
  const estimatedCostCents =
    providerOffering && estimatedCount > 0
      ? Math.round((providerOffering.hourlyRateCents * form.durationMin) / 60) * estimatedCount
      : null;

  const mutation = useMutation({
    mutationFn: () =>
      api.bookings.createRecurringSeries({
        providerId,
        petId: form.petId,
        serviceType: form.serviceType as never,
        recurrence: form.recurrence,
        daysOfWeek: form.daysOfWeek,
        timesOfDay: form.timesOfDay,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        durationMin: form.durationMin,
        notes: form.notes || undefined,
        addressSource: form.addressSource as never,
      }),
    onSuccess: (res) => {
      toast.success(`Created ${res.bookings.length} recurring bookings`);
      router.push('/bookings');
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  function toggleDay(dow: number): void {
    if (!allowedDays.has(dow)) return;
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(dow)
        ? f.daysOfWeek.filter((d) => d !== dow)
        : [...f.daysOfWeek, dow].sort((a, b) => a - b),
    }));
  }

  function setTime(index: number, value: string): void {
    setForm((f) => {
      const next = [...f.timesOfDay];
      next[index] = value;
      return { ...f, timesOfDay: next };
    });
  }

  function addTime(): void {
    setForm((f) => {
      const last = f.timesOfDay[f.timesOfDay.length - 1] ?? '09:00';
      const [lh, lm] = last.split(':').map(Number);
      const used = new Set(f.timesOfDay);
      let candidate = last;
      for (let i = 1; i <= 24; i++) {
        const h = String(((lh ?? 9) + i) % 24).padStart(2, '0');
        candidate = `${h}:${String(lm ?? 0).padStart(2, '0')}`;
        if (!used.has(candidate)) break;
      }
      return { ...f, timesOfDay: [...f.timesOfDay, candidate] };
    });
  }

  function removeTime(index: number): void {
    setForm((f) => ({
      ...f,
      timesOfDay: f.timesOfDay.filter((_, i) => i !== index),
    }));
  }

  const maxTimes = MAX_TIMES_PER_DAY[form.serviceType] ?? 1;
  const canAddTime = form.timesOfDay.length < maxTimes;

  if (!providerId) {
    return (
      <div className="py-12 text-center text-slate-500">
        Provider ID is required. Link here from a provider page.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      {provider && (
        <p className="mb-4 text-sm text-slate-500">
          Booking with <span className="font-medium text-slate-800 dark:text-slate-200">{provider.fullName}</span>
          {provider.baseCity ? ` · ${provider.baseCity}` : ''}
        </p>
      )}
      <h1 className="mb-6 text-xl font-semibold">Create Recurring Booking</h1>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {/* Pet */}
        <div>
          <label className="mb-1 block text-sm font-medium">Pet</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.petId}
            onChange={(e) => setForm((f) => ({ ...f, petId: e.target.value }))}
          >
            <option value="">Select a pet</option>
            {(pets as { id: string; name: string }[]).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Service type */}
        <div>
          <label className="mb-1 block text-sm font-medium">Service</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.serviceType}
            onChange={(e) => {
              const newType = e.target.value;
              const newMax = MAX_TIMES_PER_DAY[newType] ?? 1;
              setForm((f) => ({
                ...f,
                serviceType: newType,
                timesOfDay: f.timesOfDay.slice(0, newMax),
              }));
            }}
          >
            {(provider?.offerings ?? []).length > 0
              ? provider!.offerings.map((o) => (
                  <option key={o.serviceType} value={o.serviceType}>
                    {t(`services.${o.serviceType}`)}
                  </option>
                ))
              : <option value={form.serviceType}>{form.serviceType.replace(/_/g, ' ')}</option>
            }
          </select>
        </div>

        {/* Recurrence */}
        <div>
          <label className="mb-1 block text-sm font-medium">Frequency</label>
          <div className="flex gap-3">
            {(['weekly', 'biweekly'] as const).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurrence"
                  value={r}
                  checked={form.recurrence === r}
                  onChange={() => setForm((f) => ({ ...f, recurrence: r }))}
                />
                {r === 'weekly' ? 'Every week' : 'Every 2 weeks'}
              </label>
            ))}
          </div>
        </div>

        {/* Days of week */}
        <div>
          <label className="mb-2 block text-sm font-medium">Days of the week</label>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, dow) => {
              const enabled = allowedDays.has(dow);
              const selected = form.daysOfWeek.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  disabled={!enabled}
                  title={!enabled ? 'Provider not available this day' : undefined}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    !enabled
                      ? 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                      : selected
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {providerAvailability.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Greyed-out days are outside the provider&apos;s schedule.
            </p>
          )}
        </div>

        {/* Times of day */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">
              Times of day
              <span className="ml-1 font-normal text-slate-400">
                — max {maxTimes} per day
              </span>
            </label>
          </div>
          {selectedDaySlots.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">
              Provider available:{' '}
              {selectedDaySlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ')}
            </p>
          )}
          <div className="space-y-2">
            {form.timesOfDay.map((time, idx) => {
              const outOfWindow = selectedDaySlots.length > 0 && !timeInWindow(time, selectedDaySlots);
              const duplicate = form.timesOfDay.indexOf(time) !== idx;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="time"
                    className={`rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 ${
                      outOfWindow || duplicate
                        ? 'border-red-400 dark:border-red-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    value={time}
                    onChange={(e) => setTime(idx, e.target.value)}
                  />
                  {outOfWindow && (
                    <span className="text-xs text-red-500">Outside provider hours</span>
                  )}
                  {duplicate && !outOfWindow && (
                    <span className="text-xs text-red-500">Duplicate time</span>
                  )}
                  {form.timesOfDay.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(idx)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {canAddTime && (
            <button
              type="button"
              onClick={addTime}
              className="mt-2 text-sm text-brand-600 hover:underline"
            >
              + Add another time
            </button>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-sm font-medium">Duration per session</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.durationMin}
            onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </div>

        {/* Start / End date */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Start date</label>
            <input
              type="date"
              min={today}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">
              End date
              <span className="ml-1 font-normal text-slate-400">(opt.)</span>
            </label>
            <input
              type="date"
              min={form.startDate || today}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
        {!form.endDate && form.startDate && (
          <p className="text-xs text-slate-400">No end date → defaults to 12 weeks from start</p>
        )}

        {/* Address source */}
        <div>
          <label className="mb-1 block text-sm font-medium">Service location</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.addressSource}
            onChange={(e) => setForm((f) => ({ ...f, addressSource: e.target.value }))}
          >
            <option value="owner_pet">My pet&apos;s address</option>
            <option value="owner_user">My address</option>
            <option value="provider_user">Provider&apos;s address</option>
            <option value="provider_offering">Provider&apos;s service address</option>
          </select>
        </div>

        {/* Provider blackouts info */}
        {providerBlackouts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
            <p className="font-medium text-amber-800 dark:text-amber-300">Provider unavailability</p>
            <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
              {providerBlackouts.map((b) => (
                <li key={b.id}>
                  {b.startDate} → {b.endDate}
                  {b.reason ? ` (${b.reason})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {/* Summary */}
        {estimatedCount > 0 && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p className="font-medium">Booking summary</p>
            <p className="mt-1 text-slate-500">
              ~{estimatedCount} sessions
              {estimatedCostCents != null
                ? ` · est. total $${(estimatedCostCents / 100).toFixed(2)}`
                : ''}
            </p>
            {skippedCount > 0 && (
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                {skippedCount} session{skippedCount !== 1 ? 's' : ''} skipped — provider unavailable on those dates.
              </p>
            )}
          </div>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canSubmit}
          className="w-full"
        >
          {mutation.isPending
            ? 'Creating…'
            : estimatedCount > 0
            ? `Create recurring bookings (~${estimatedCount})`
            : 'Create recurring bookings'}
        </Button>
      </div>
    </div>
  );
}
