import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lt, lte, ne, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  bookings,
  externalBusyBlocks,
  providerAvailability,
  providerServiceOfferings,
  providerSlots,
} from '../../db/schema/index.js';

import type { FreeSlot, FreeSlotsQuery } from '@petwalker/shared';

interface BusyWindow {
  start: number;
  end: number;
}

/**
 * Compute a provider's bookable windows in [from, to) for a given duration.
 *
 * Algorithm:
 *   1. Collect weekly availability slots for every UTC day overlapping the
 *      window — these are the "open" intervals.
 *   2. Collect all blocking events: non-cancelled bookings + external busy
 *      blocks for the same provider, clamped to [from, to).
 *   3. Walk each open interval in `step` increments; emit a candidate
 *      `[t, t+duration)` only if it fits inside the open interval AND
 *      doesn't overlap any blocker.
 *
 * Returns slots in chronological order. Capped at 200 slots — owners pick
 * one, they don't paginate the picker. Callers can narrow the window or
 * widen the step if they hit the cap.
 */
@Injectable()
export class FreeSlotsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async compute(providerId: string, q: FreeSlotsQuery): Promise<FreeSlot[]> {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (to.getTime() <= from.getTime()) return [];

    // Look up the offering to pick the booking mode. No active offering
    // means there's nothing to book — return empty rather than computing
    // window-mode slots that would 422 on booking anyway.
    const [offering] = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, providerId),
          eq(providerServiceOfferings.serviceType, q.serviceType),
          eq(providerServiceOfferings.active, true),
        ),
      );
    if (!offering) return [];

    if (offering.bookingMode === 'slot') {
      return this.computeSlotMode(providerId, q.serviceType, from, to);
    }
    return this.computeWindowMode(providerId, q, from, to);
  }

  /**
   * Slot-mode: read pre-published rows from `provider_slots`. Filters to
   * status='open' and excludes external-calendar conflicts (we still respect
   * iCal busy blocks on slot-mode offerings — the provider gets booked solid
   * during a published slot if their calendar says they're free, otherwise
   * we hide it). Bookings already consume slots transactionally, so we
   * don't re-check them here.
   */
  private async computeSlotMode(
    providerId: string,
    serviceType: FreeSlotsQuery['serviceType'],
    from: Date,
    to: Date,
  ): Promise<FreeSlot[]> {
    const fromIso = from.toISOString();

    const rows = await this.db
      .select({ start: providerSlots.startTs, end: providerSlots.endTs })
      .from(providerSlots)
      .where(
        and(
          eq(providerSlots.providerId, providerId),
          eq(providerSlots.serviceType, serviceType),
          eq(providerSlots.status, 'open'),
          gte(providerSlots.startTs, from),
          lt(providerSlots.startTs, to),
        ),
      )
      .orderBy(asc(providerSlots.startTs))
      .limit(200);

    if (rows.length === 0) return [];

    // External busy blocks for the same window — fetch once and bucket-check.
    const busyRows = await this.db
      .select({ startTs: externalBusyBlocks.startTs, endTs: externalBusyBlocks.endTs })
      .from(externalBusyBlocks)
      .where(
        and(
          eq(externalBusyBlocks.providerId, providerId),
          lt(externalBusyBlocks.startTs, to),
          sql`${externalBusyBlocks.endTs} > ${fromIso}::timestamptz`,
        ),
      );
    const busyWindows: BusyWindow[] = busyRows
      .map((r) => ({ start: r.startTs.getTime(), end: r.endTs.getTime() }))
      .sort((a, b) => a.start - b.start);

    const out: FreeSlot[] = [];
    for (const row of rows) {
      const start = row.start.getTime();
      const end = row.end.getTime();
      if (intersectsAny(start, end, busyWindows)) continue;
      out.push({ start: row.start.toISOString(), end: row.end.toISOString() });
    }
    return out;
  }

  /**
   * Window-mode: walk weekly availability + booking/busy blockers and emit
   * step-aligned candidate windows. (Original behaviour, kept verbatim.)
   */
  private async computeWindowMode(
    providerId: string,
    q: FreeSlotsQuery,
    from: Date,
    to: Date,
  ): Promise<FreeSlot[]> {
    const durationMs = q.durationMin * 60_000;
    const stepMs = (q.stepMin ?? q.durationMin) * 60_000;

    // 1. Weekly availability for the provider.
    const availabilityRows = await this.db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.providerId, providerId));

    if (availabilityRows.length === 0) return [];

    // Group by day-of-week for fast lookup as we walk days.
    const slotsByDow = new Map<number, { start: string; end: string }[]>();
    for (const row of availabilityRows) {
      const arr = slotsByDow.get(row.dayOfWeek) ?? [];
      arr.push({ start: row.startTime, end: row.endTime });
      slotsByDow.set(row.dayOfWeek, arr);
    }

    // 2. Blocking events.
    const busyWindows: BusyWindow[] = [];

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const bookingRows = await this.db
      .select({
        scheduledAt: bookings.scheduledAt,
        durationMin: bookings.durationMin,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          ne(bookings.status, 'cancelled'),
          // booking.scheduledAt < to AND booking.scheduledAt + duration > from
          lt(bookings.scheduledAt, to),
          sql`${bookings.scheduledAt} + (${bookings.durationMin} * INTERVAL '1 minute') > ${fromIso}::timestamptz`,
        ),
      );
    for (const r of bookingRows) {
      const start = r.scheduledAt.getTime();
      const end = start + r.durationMin * 60_000;
      busyWindows.push({ start, end });
    }

    const busyRows = await this.db
      .select({ startTs: externalBusyBlocks.startTs, endTs: externalBusyBlocks.endTs })
      .from(externalBusyBlocks)
      .where(
        and(
          eq(externalBusyBlocks.providerId, providerId),
          lt(externalBusyBlocks.startTs, to),
          sql`${externalBusyBlocks.endTs} > ${fromIso}::timestamptz`,
        ),
      );
    for (const r of busyRows) {
      busyWindows.push({ start: r.startTs.getTime(), end: r.endTs.getTime() });
    }

    busyWindows.sort((a, b) => a.start - b.start);

    // 3. Walk each UTC day, intersect availability slots with [from, to),
    //    step through and emit free candidates.
    const out: FreeSlot[] = [];
    const HARD_CAP = 200;
    const dayMs = 24 * 60 * 60 * 1000;

    for (
      let dayStart = utcMidnight(from);
      dayStart.getTime() < to.getTime() && out.length < HARD_CAP;
      dayStart = new Date(dayStart.getTime() + dayMs)
    ) {
      const dow = dayStart.getUTCDay();
      const slots = slotsByDow.get(dow);
      if (!slots) continue;
      for (const slot of slots) {
        const slotStart = applyTimeOfDay(dayStart, slot.start);
        const slotEnd = applyTimeOfDay(dayStart, slot.end);
        // Clamp to [from, to).
        const winStart = Math.max(slotStart.getTime(), from.getTime());
        const winEnd = Math.min(slotEnd.getTime(), to.getTime());
        if (winEnd - winStart < durationMs) continue;

        for (
          let t = roundUp(winStart, stepMs);
          t + durationMs <= winEnd && out.length < HARD_CAP;
          t += stepMs
        ) {
          if (!intersectsAny(t, t + durationMs, busyWindows)) {
            out.push({
              start: new Date(t).toISOString(),
              end: new Date(t + durationMs).toISOString(),
            });
          }
        }
      }
    }

    return out;
  }
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function applyTimeOfDay(day: Date, hms: string): Date {
  const [h, m, s] = hms.split(':').map(Number);
  const dt = new Date(day);
  dt.setUTCHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return dt;
}

function roundUp(t: number, step: number): number {
  return Math.ceil(t / step) * step;
}

/** True if [start, end) overlaps any window. busyWindows must be sorted. */
function intersectsAny(start: number, end: number, busy: BusyWindow[]): boolean {
  for (const w of busy) {
    if (w.start >= end) return false; // sorted, no further overlap possible
    if (w.end > start) return true;
  }
  return false;
}
