/**
 * Provider's recurring weekly availability slot.
 * All times are interpreted in UTC (the project decision — no per-provider timezone).
 *
 *   dayOfWeek: 0 = Sunday, 6 = Saturday (matches `Date.prototype.getUTCDay()`).
 *   startTime / endTime: 'HH:MM' (24-hour, UTC).
 *
 * A booking at `scheduledAt` of duration `durationMin` is allowed iff a slot exists
 * where: dayOfWeek matches AND startTime ≤ scheduledTimeUtc AND endTime ≥ scheduledTimeUtc + duration.
 */
export interface AvailabilitySlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string; // 'HH:MM'
  endTime: string;   // 'HH:MM'
}
