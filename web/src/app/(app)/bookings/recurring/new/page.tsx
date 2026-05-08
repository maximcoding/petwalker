'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { prettifyError } from '@/lib/prettify-error';

import type { AvailabilitySlot, ServiceProviderDetail } from '@petwalker/shared/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

const MAX_TIMES_PER_DAY: Record<string, number> = {
  walking: 4, sitting: 3, senior_care: 3, fitness: 2, training: 2,
  grooming: 1, boarding: 1, daycare: 1, photography: 1, massage_wellness: 1, veterinary: 1,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Days that have at least one availability slot. */
function availableDays(availability: AvailabilitySlot[]): Set<number> {
  return new Set(availability.map((s) => s.dayOfWeek));
}

/** Slots for a given day, sorted by start. */
function slotsForDay(availability: AvailabilitySlot[], dow: number): AvailabilitySlot[] {
  return availability.filter((s) => s.dayOfWeek === dow).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** True if `time` (HH:MM) falls within any of the provider's slots for the selected days. */
function timeInWindow(time: string, slots: AvailabilitySlot[]): boolean {
  if (slots.length === 0) return true; // no availability defined — don't block
  return slots.some((s) => time >= s.startTime && time <= s.endTime);
}

/** Earliest startTime across selected days' slots. */
function minTime(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) return '00:00';
  return slots.reduce((m, s) => (s.startTime < m ? s.startTime : m), slots[0]!.startTime);
}

/** Latest endTime across selected days' slots. */
function maxTime(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) return '23:59';
  return slots.reduce((m, s) => (s.endTime > m ? s.endTime : m), slots[0]!.endTime);
}

function buildTimeDefaults(count: number, slots: AvailabilitySlot[]): string[] {
  const base = slots.length > 0 ? slots[0]!.startTime : '09:00';
  const [bh, bm] = base.split(':').map(Number);
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = String((bh! + i) % 24).padStart(2, '0');
    const m = String(bm!).padStart(2, '0');
    times.push(`${h}:${m}`);
  }
  return times;
}

function prettifyRecurringError(t: (k: string) => string, e: Error): string {
  const msg = e.message;
  if (msg.includes('OUTSIDE_AVAILABILITY')) return 'One or more selected times fall outside the provider\'s schedule.';
  if (msg.includes('OVERLAPPING_BOOKING')) return 'One or more slots conflict with an existing booking.';
  if (msg.includes('TOO_MANY_TIMES_PER_DAY')) return 'Too many time slots for this service type.';
  if (msg.includes('PROVIDER_NO_OFFERING')) return 'Provider doesn\'t offer this service.';
  if (msg.includes('OWNER_ADDRESS_MISSING')) return 'Add an address in your profile first.';
  return prettifyError(t, e);
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

  const { data: provider, isLoading: providerLoading } = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: !!providerId,
  });

  // Derive available service types from provider offerings
  const offeringTypes = useMemo(
    () => provider?.offerings.map((o) => o.serviceType) ?? [],
    [provider],
  );

  const initialService = useMemo(() => {
    if (!provider) return serviceParam || 'walking';
    if (serviceParam && offeringTypes.includes(serviceParam as never)) return serviceParam;
    return offeringTypes[0] ?? 'walking';
  }, [provider, serviceParam, offeringTypes]);

  const [form, setForm] = useState({
    petId: '',
    serviceType: initialService,
    recurrence: 'weekly' as 'weekly' | 'biweekly',
    daysOfWeek: [] as number[],
    timesOfDay: ['09:00'] as string[],
    startDate: today(),
    endDate: '',
    durationMin: 60,
    notes: '',
    addressSource: 'owner_pet' as string,
  });

  // When provider loads, set sensible defaults from their availability
  const availability = provider?.availability ?? [];

  const activeDays = useMemo(() => availableDays(availability), [availability]);

  // Selected days' slots — used to constrain times
  const selectedDaySlots = useMemo(
    () => form.daysOfWeek.flatMap((d) => slotsForDay(availability, d)),
    [form.daysOfWeek, availability],
  );

  const maxTimes = MAX_TIMES_PER_DAY[form.serviceType] ?? 1;
  const canAddTime = form.timesOfDay.length < maxTimes;

  const offering = provider?.offerings.find((o) => o.serviceType === form.serviceType);
  const hourlyRate = offering ? offering.hourlyRateCents / 100 : null;

  // Rough booking count estimate
  const estimatedCount = useMemo(() => {
    if (!form.startDate || form.daysOfWeek.length === 0 || form.timesOfDay.length === 0) return null;
    const start = new Date(form.startDate);
    const end = form.endDate ? new Date(form.endDate) : new Date(form.startDate);
    if (!form.endDate) end.setDate(end.getDate() + 84); // 12 weeks default
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 86400_000));
    const weeksStep = form.recurrence === 'biweekly' ? 2 : 1;
    const effectiveWeeks = Math.ceil(weeks / weeksStep);
    return effectiveWeeks * form.daysOfWeek.length * form.timesOfDay.length;
  }, [form.startDate, form.endDate, form.daysOfWeek, form.timesOfDay, form.recurrence]);

  const estimatedCost = hourlyRate !== null && estimatedCount !== null
    ? (hourlyRate * (form.durationMin / 60) * estimatedCount).toFixed(2)
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
    onError: (e: Error) => toast.error(prettifyRecurringError(t, e)),
  });

  function toggleDay(dow: number): void {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(dow)
        ? f.daysOfWeek.filter((d) => d !== dow)
        : [...f.daysOfWeek, dow].sort((a, b) => a - b),
    }));
  }

  function setTime(index: number, value: string): void {
    setForm((f) => {
      if (f.timesOfDay.some((t, i) => i !== index && t === value)) return f;
      const next = [...f.timesOfDay];
      next[index] = value;
      return { ...f, timesOfDay: next };
    });
  }

  function addTime(): void {
    setForm((f) => {
      const base = selectedDaySlots.length > 0 ? selectedDaySlots[0]!.startTime : '09:00';
      const [bh, bm] = base.split(':').map(Number);
      const used = new Set(f.timesOfDay);
      let candidate = base;
      for (let i = 0; i < 24; i++) {
        const h = String((bh! + i) % 24).padStart(2, '0');
        candidate = `${h}:${String(bm!).padStart(2, '0')}`;
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

  if (!providerId) {
    return <div className="py-12 text-center text-slate-500">Provider ID is required.</div>;
  }

  if (providerLoading) {
    return <div className="py-12 text-center text-slate-500">Loading…</div>;
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800';
  const sectionCls = 'space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900';

  return (
    <div className="mx-auto max-w-lg py-8">
      {/* Provider context */}
      {provider && (
        <div className="mb-4 flex items-center gap-3">
          <div>
            <p className="text-xs text-slate-500">Booking with</p>
            <p className="font-semibold">{provider.fullName}</p>
          </div>
        </div>
      )}

      <h1 className="mb-6 text-xl font-semibold">Set up recurring bookings</h1>

      <div className={sectionCls}>

        {/* Pet */}
        <div>
          <label className="mb-1 block text-sm font-medium">Pet</label>
          <select className={inputCls} value={form.petId}
            onChange={(e) => setForm((f) => ({ ...f, petId: e.target.value }))}>
            <option value="">Select a pet</option>
            {(pets as { id: string; name: string }[]).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Service — only provider's offerings */}
        <div>
          <label className="mb-1 block text-sm font-medium">Service</label>
          <select className={inputCls} value={form.serviceType}
            onChange={(e) => {
              const newType = e.target.value;
              const newMax = MAX_TIMES_PER_DAY[newType] ?? 1;
              setForm((f) => ({
                ...f,
                serviceType: newType,
                timesOfDay: f.timesOfDay.slice(0, newMax),
              }));
            }}>
            {(offeringTypes.length > 0 ? offeringTypes : [form.serviceType]).map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          {hourlyRate !== null && (
            <p className="mt-1 text-xs text-slate-500">${hourlyRate.toFixed(2)}/h</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-sm font-medium">Duration per session</label>
          <select className={inputCls} value={form.durationMin}
            onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label className="mb-2 block text-sm font-medium">Repeat</label>
          <div className="flex gap-3">
            {(['weekly', 'biweekly'] as const).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="recurrence" value={r}
                  checked={form.recurrence === r}
                  onChange={() => setForm((f) => ({ ...f, recurrence: r }))} />
                {r === 'weekly' ? 'Every week' : 'Every 2 weeks'}
              </label>
            ))}
          </div>
        </div>

        {/* Days */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Which days?
            {availability.length > 0 && (
              <span className="ml-1 font-normal text-slate-400">— provider available on highlighted days</span>
            )}
          </label>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, dow) => {
              const providerAvailable = activeDays.size === 0 || activeDays.has(dow);
              const selected = form.daysOfWeek.includes(dow);
              return (
                <button key={dow} type="button" onClick={() => toggleDay(dow)}
                  disabled={!providerAvailable}
                  title={!providerAvailable ? 'Provider not available this day' : undefined}
                  className={[
                    'rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                    !providerAvailable
                      ? 'cursor-not-allowed opacity-30 bg-slate-100 text-slate-400 dark:bg-slate-800'
                      : selected
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  ].join(' ')}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Times */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">
              Time{form.timesOfDay.length > 1 ? 's' : ''} each day
              <span className="ml-1 font-normal text-slate-400">
                — up to {maxTimes} for {form.serviceType.replace(/_/g, ' ')}
              </span>
            </label>
          </div>
          {selectedDaySlots.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">
              Provider available {selectedDaySlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ')}
            </p>
          )}
          <div className="space-y-2">
            {form.timesOfDay.map((time, idx) => {
              const outOfWindow = selectedDaySlots.length > 0 && !timeInWindow(time, selectedDaySlots);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <input type="time"
                    min={selectedDaySlots.length > 0 ? minTime(selectedDaySlots) : undefined}
                    max={selectedDaySlots.length > 0 ? maxTime(selectedDaySlots) : undefined}
                    className={[
                      'rounded-xl border px-3 py-2 text-sm dark:bg-slate-800',
                      outOfWindow
                        ? 'border-red-400 dark:border-red-600'
                        : 'border-slate-200 dark:border-slate-700',
                    ].join(' ')}
                    value={time}
                    onChange={(e) => setTime(idx, e.target.value)} />
                  {outOfWindow && (
                    <span className="text-xs text-red-500">Outside provider hours</span>
                  )}
                  {form.timesOfDay.length > 1 && !outOfWindow && (
                    <button type="button" onClick={() => removeTime(idx)}
                      className="text-sm text-red-500 hover:text-red-700">Remove</button>
                  )}
                  {form.timesOfDay.length > 1 && outOfWindow && (
                    <button type="button" onClick={() => removeTime(idx)}
                      className="text-sm text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>
              );
            })}
          </div>
          {canAddTime && (
            <button type="button" onClick={addTime}
              className="mt-2 text-sm text-brand-600 hover:underline">
              + Add another time
            </button>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Start date</label>
            <input type="date" className={inputCls}
              min={today()}
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              End date <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input type="date" className={inputCls}
              min={form.startDate || today()}
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        {!form.endDate && (
          <p className="text-xs text-slate-400">No end date = 12 weeks from start</p>
        )}

        {/* Address */}
        <div>
          <label className="mb-1 block text-sm font-medium">Service location</label>
          <select className={inputCls} value={form.addressSource}
            onChange={(e) => setForm((f) => ({ ...f, addressSource: e.target.value }))}>
            <option value="owner_pet">My pet&apos;s address</option>
            <option value="owner_user">My address</option>
            <option value="provider_user">Provider&apos;s address</option>
            <option value="provider_offering">Provider&apos;s service address</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea className={inputCls} rows={2}
            placeholder="Anything the provider should know"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* Summary */}
        {estimatedCount !== null && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <p className="font-medium">Estimated: ~{estimatedCount} sessions</p>
            {estimatedCost && (
              <p className="mt-0.5 text-slate-500">≈ ${estimatedCost} total at ${hourlyRate!.toFixed(2)}/h · {form.durationMin} min each</p>
            )}
          </div>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            !form.petId ||
            !form.startDate ||
            form.daysOfWeek.length === 0 ||
            form.timesOfDay.length === 0 ||
            form.timesOfDay.some((t) => selectedDaySlots.length > 0 && !timeInWindow(t, selectedDaySlots))
          }
          className="w-full">
          {mutation.isPending ? 'Creating…' : `Create recurring bookings${estimatedCount ? ` (~${estimatedCount})` : ''}`}
        </Button>
      </div>
    </div>
  );
}
