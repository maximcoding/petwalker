export type RecurrencePattern = 'weekly' | 'biweekly';

export interface RecurrenceDatesOptions {
  recurrence: RecurrencePattern;
  daysOfWeek: number[];
  timeOfDay: string;
  startDate: string;
  endDate: string;
}

export const MAX_RECURRING_INSTANCES = 52;

export function generateRecurrenceDates(opts: RecurrenceDatesOptions): Date[] {
  const { recurrence, daysOfWeek, timeOfDay, startDate, endDate } = opts;
  const [hStr, mStr] = timeOfDay.split(':');
  const h = parseInt(hStr!, 10);
  const m = parseInt(mStr!, 10);

  const parseDate = (s: string): number =>
    Date.UTC(
      parseInt(s.slice(0, 4), 10),
      parseInt(s.slice(5, 7), 10) - 1,
      parseInt(s.slice(8, 10), 10),
    );

  const startMs = parseDate(startDate);
  const endMs = parseDate(endDate) + 23 * 3600_000 + 59 * 60_000 + 59_000;

  if (startMs > endMs) return [];

  const weekStepMs = (recurrence === 'biweekly' ? 2 : 1) * 7 * 86_400_000;
  const results: Date[] = [];

  const startDow = new Date(startMs).getUTCDay();
  let weekCurMs = startMs - startDow * 86_400_000;

  while (weekCurMs <= endMs) {
    for (const dow of daysOfWeek) {
      const dayMs = weekCurMs + dow * 86_400_000;
      if (dayMs >= startMs && dayMs <= endMs) {
        results.push(new Date(dayMs + h * 3_600_000 + m * 60_000));
      }
    }
    weekCurMs += weekStepMs;
  }

  results.sort((a, b) => a.getTime() - b.getTime());
  return results.slice(0, MAX_RECURRING_INSTANCES);
}

export function addWeeks(date: string, n: number): string {
  const d = new Date(
    Date.UTC(
      parseInt(date.slice(0, 4), 10),
      parseInt(date.slice(5, 7), 10) - 1,
      parseInt(date.slice(8, 10), 10),
    ),
  );
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}
