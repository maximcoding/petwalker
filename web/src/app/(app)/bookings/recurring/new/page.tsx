'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { prettifyError } from '@/lib/prettify-error';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SERVICE_TYPES = [
  'walking', 'grooming', 'sitting', 'boarding', 'training',
  'daycare', 'photography', 'massage_wellness', 'senior_care',
  'veterinary', 'fitness',
] as const;

export default function CreateRecurringSeriesPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const providerId = params.get('providerId') ?? '';

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: pets = [] } = useQuery({
    queryKey: ['pets'],
    queryFn: () => api.pets.list(),
    enabled: !!me,
  });

  const [form, setForm] = useState({
    petId: '',
    serviceType: 'walking' as string,
    recurrence: 'weekly' as 'weekly' | 'biweekly',
    daysOfWeek: [1] as number[],
    timeOfDay: '09:00',
    startDate: '',
    endDate: '',
    durationMin: 60,
    notes: '',
    addressSource: 'owner_pet' as string,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.bookings.createRecurringSeries({
        providerId,
        petId: form.petId,
        serviceType: form.serviceType as never,
        recurrence: form.recurrence,
        daysOfWeek: form.daysOfWeek,
        timeOfDay: form.timeOfDay,
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
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(dow)
        ? f.daysOfWeek.filter((d) => d !== dow)
        : [...f.daysOfWeek, dow].sort((a, b) => a - b),
    }));
  }

  if (!providerId) {
    return (
      <div className="py-12 text-center text-slate-500">
        Provider ID is required. Link here from a provider page.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
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
            onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
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
          <label className="mb-2 block text-sm font-medium">Days (UTC)</label>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, dow) => (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  form.daysOfWeek.includes(dow)
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div>
          <label className="mb-1 block text-sm font-medium">Time (UTC)</label>
          <input
            type="time"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.timeOfDay}
            onChange={(e) => setForm((f) => ({ ...f, timeOfDay: e.target.value }))}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            min={15}
            max={1440}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.durationMin}
            onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
          />
        </div>

        {/* Start date */}
        <div>
          <label className="mb-1 block text-sm font-medium">Start date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>

        {/* End date */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            End date <span className="font-normal text-slate-400">(optional — default: 12 weeks)</span>
          </label>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>

        {/* Address source */}
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
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

        <Button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            !form.petId ||
            !form.startDate ||
            form.daysOfWeek.length === 0
          }
          className="w-full"
        >
          {mutation.isPending ? 'Creating…' : 'Create recurring bookings'}
        </Button>
      </div>
    </div>
  );
}
