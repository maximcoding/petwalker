import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  providerAvailability,
  providerServiceOfferings,
  providerSlots,
  type NewProviderSlotRow,
} from '../../db/schema/index.js';

import type { ServiceType } from '@petwalker/shared/enums';

/** How far ahead the generator publishes slots. */
const SLOT_HORIZON_DAYS = 90;

/** Avoid generating slots in the immediate past from clock skew. */
const PAST_GUARD_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Materializes discrete bookable slots for a slot-mode offering.
 *
 * Algorithm:
 *   1. Read the provider's weekly availability template.
 *   2. For each UTC day in [now, now + 90d], pull the matching day-of-week
 *      slots, divide each into `slotDurationMin` buckets, emit a row in
 *      `provider_slots`.
 *   3. `INSERT ... ON CONFLICT DO NOTHING` against the
 *      (provider, service_type, start_ts) unique key — safe to re-run, won't
 *      stomp on bookings already linked to existing slots.
 *
 * NOT run on a cron yet — providers explicitly trigger via
 * "Publish slots now" in the profile UI, and the offering save hook calls
 * it whenever the offering is in slot mode. A nightly extender would walk
 * the trailing edge of the horizon; deferred until volume warrants it.
 */
@Injectable()
export class SlotGeneratorService {
  private readonly log = new Logger(SlotGeneratorService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * Generate slots for one (provider, serviceType) offering. Returns the
   * number of new slot rows actually inserted (excludes ON CONFLICT
   * collisions with previous runs).
   */
  async generate(providerId: string, serviceType: ServiceType): Promise<number> {
    const [offering] = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, providerId),
          eq(providerServiceOfferings.serviceType, serviceType),
        ),
      );
    if (!offering) return 0;
    if (offering.bookingMode !== 'slot') return 0;
    if (!offering.active) return 0;

    const slotMs = offering.slotDurationMin * 60_000;
    if (slotMs <= 0) return 0;

    const availability = await this.db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.providerId, providerId));
    if (availability.length === 0) return 0;

    // Group availability by day-of-week so each day's lookup is O(1).
    const slotsByDow = new Map<number, { startTime: string; endTime: string }[]>();
    for (const a of availability) {
      const arr = slotsByDow.get(a.dayOfWeek) ?? [];
      arr.push({ startTime: a.startTime, endTime: a.endTime });
      slotsByDow.set(a.dayOfWeek, arr);
    }

    const now = Date.now();
    const horizonEnd = now + SLOT_HORIZON_DAYS * DAY_MS;

    const newSlots: NewProviderSlotRow[] = [];

    for (
      let dayStart = utcMidnight(new Date(now));
      dayStart.getTime() < horizonEnd;
      dayStart = new Date(dayStart.getTime() + DAY_MS)
    ) {
      const dow = dayStart.getUTCDay();
      const windows = slotsByDow.get(dow);
      if (!windows) continue;
      for (const w of windows) {
        const winStart = applyTimeOfDay(dayStart, w.startTime).getTime();
        const winEnd = applyTimeOfDay(dayStart, w.endTime).getTime();
        for (let t = winStart; t + slotMs <= winEnd; t += slotMs) {
          if (t < now + PAST_GUARD_MS) continue;
          newSlots.push({
            providerId,
            serviceType,
            startTs: new Date(t),
            endTs: new Date(t + slotMs),
            status: 'open',
          });
        }
      }
    }

    if (newSlots.length === 0) return 0;

    let inserted = 0;
    // Postgres bind-param ceiling means we batch — 8 cols * 500 rows = 4000.
    const BATCH = 500;
    for (let i = 0; i < newSlots.length; i += BATCH) {
      const slice = newSlots.slice(i, i + BATCH);
      const res = await this.db
        .insert(providerSlots)
        .values(slice)
        .onConflictDoNothing({
          target: [
            providerSlots.providerId,
            providerSlots.serviceType,
            providerSlots.startTs,
          ],
        })
        .returning({ id: providerSlots.id });
      inserted += res.length;
    }

    this.log.log(
      `generated ${inserted} new slots for ${providerId}/${serviceType} (${newSlots.length} candidates)`,
    );
    return inserted;
  }

  /**
   * Best-effort cleanup: drop `open` slots far enough in the past that
   * they're no longer useful. `booked`/`cancelled` rows are kept for audit.
   */
  async pruneStale(providerId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * DAY_MS);
    const res = await this.db
      .delete(providerSlots)
      .where(
        and(
          eq(providerSlots.providerId, providerId),
          eq(providerSlots.status, 'open'),
          // start_ts < cutoff
          sql`${providerSlots.startTs} < ${cutoff.toISOString()}::timestamptz`,
        ),
      );
    return Number(
      // postgres-js returns the affected count via res.count or `.rowCount`
      // depending on driver shape. Fall back to 0 if neither is available.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res as any).rowCount ?? (res as any).count ?? 0,
    );
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

