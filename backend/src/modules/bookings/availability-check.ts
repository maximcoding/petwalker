/**
 * Availability + overlap checks (UTC).
 *
 * Decision: all times are UTC. We don't track per-provider timezone — the provider
 * sets their availability in UTC and the client converts on display.
 */

import { and, eq, gt, gte, lt, lte, ne, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { bookings, externalBusyBlocks, providerAvailability } from '../../db/schema/index.js';

/** "HH:MM:SS" string (Postgres TIME) for a given UTC moment. */
function toUtcTimeStr(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * True if at least one weekly slot covers [scheduledAt, scheduledAt + durationMin)
 * entirely on the same UTC day.
 *
 * We don't (yet) support slots crossing midnight UTC. If your booking spans midnight
 * UTC, returns false — the caller should reject with 422.
 */
export async function hasAvailability(
  db: Database,
  providerId: string,
  scheduledAt: Date,
  durationMin: number,
): Promise<boolean> {
  const start = scheduledAt;
  const end = new Date(scheduledAt.getTime() + durationMin * 60_000);
  if (start.getUTCDay() !== end.getUTCDay() || end.getUTCDate() !== start.getUTCDate()) {
    return false;
  }
  const dow = start.getUTCDay();
  const startStr = toUtcTimeStr(start);
  const endStr = toUtcTimeStr(end);

  const rows = await db
    .select({ ok: sql<number>`1` })
    .from(providerAvailability)
    .where(
      and(
        eq(providerAvailability.providerId, providerId),
        eq(providerAvailability.dayOfWeek, dow),
        lte(providerAvailability.startTime, startStr),
        gte(providerAvailability.endTime, endStr),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * True if there's at least one non-cancelled booking that overlaps
 * [newStart, newEnd) for this provider.
 *
 * Using Postgres tstzrange + && operator for clean overlap math.
 */
export async function hasOverlap(
  db: Database,
  providerId: string,
  newStart: Date,
  newEnd: Date,
  ignoreBookingId: string | null = null,
): Promise<boolean> {
  // postgres-js can't bind raw Date objects in a sql template — convert to ISO
  // strings so the bound params are wire-compatible.
  const startIso = newStart.toISOString();
  const endIso = newEnd.toISOString();

  const rows = await db
    .select({ ok: sql<number>`1` })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        ne(bookings.status, 'cancelled'),
        ignoreBookingId ? ne(bookings.id, ignoreBookingId) : undefined,
        sql`tstzrange(${bookings.scheduledAt}, ${bookings.scheduledAt} + (${bookings.durationMin} * INTERVAL '1 minute')) && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz)`,
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * True if at least one external (synced from iCal) busy block intersects
 * [newStart, newEnd) for this provider.
 *
 * Half-open interval semantics: a block from 14:00–15:00 conflicts with
 * 13:30–14:30 (overlap) but NOT with 15:00–16:00 (touches at boundary).
 * That matches the bookings overlap behavior so back-to-back slots remain
 * bookable.
 */
export async function hasExternalBusyConflict(
  db: Database,
  providerId: string,
  newStart: Date,
  newEnd: Date,
): Promise<boolean> {
  const rows = await db
    .select({ ok: sql<number>`1` })
    .from(externalBusyBlocks)
    .where(
      and(
        eq(externalBusyBlocks.providerId, providerId),
        // block.start_ts < newEnd  AND  block.end_ts > newStart
        lt(externalBusyBlocks.startTs, newEnd),
        gt(externalBusyBlocks.endTs, newStart),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
