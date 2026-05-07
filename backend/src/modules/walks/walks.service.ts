import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { bookings, walks, type WalkRow } from '../../db/schema/index.js';

import { mapWalkRow } from './walk.mapper.js';

import type { GeoSample, UUID, Walk } from '@petwalker/shared';

@Injectable()
export class WalksService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * Fetch the walk for a booking. Either party (owner or provider) may read it.
   * Throws 404 if no walk exists yet (i.e., booking hasn't started, or it's a
   * non-Walking service type).
   */
  async getByBookingId(viewerId: UUID, bookingId: UUID): Promise<Walk> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.ownerId !== viewerId && booking.providerId !== viewerId) {
      throw new ForbiddenException('Not your booking');
    }

    const [walk] = await this.db.select().from(walks).where(eq(walks.bookingId, bookingId));
    if (!walk) throw new NotFoundException('Walk not started yet');
    return mapWalkRow(walk as WalkRow);
  }

  /**
   * Append a batch of GPS samples to the walk's polyline jsonb. Idempotent
   * against duplicate timestamps — samples already present (same `t`) are
   * dropped so a flaky retry from the client doesn't double-count distance.
   *
   * Caller must verify that `providerId` actually owns this walk (via the
   * tracking gateway's room-membership check) before invoking this.
   */
  async appendSamples(walkId: UUID, samples: GeoSample[]): Promise<void> {
    if (samples.length === 0) return;

    // Pull current polyline, dedupe + concat + sort, write back.
    // Single round-trip would be better via jsonb operators, but volume is low
    // (a flush every 10s with <50 samples) and the read+write keeps it simple.
    const [walk] = await this.db.select().from(walks).where(eq(walks.id, walkId));
    if (!walk) throw new NotFoundException('Walk not found');

    const existing = ((walk as WalkRow).polyline ?? []) as GeoSample[];
    const seen = new Set(existing.map((s) => s.t));
    const fresh = samples.filter((s) => !seen.has(s.t));
    if (fresh.length === 0) return;

    const merged = [...existing, ...fresh].sort((a, b) => a.t - b.t);

    await this.db
      .update(walks)
      .set({ polyline: merged })
      .where(eq(walks.id, walkId));
  }

  /** Used by the tracking gateway to authorize ping streams. */
  async findActiveWalkForBooking(bookingId: UUID): Promise<Walk | null> {
    const [walk] = await this.db
      .select()
      .from(walks)
      .where(eq(walks.bookingId, bookingId));
    if (!walk) return null;
    if ((walk as WalkRow).endedAt) return null; // already ended
    return mapWalkRow(walk as WalkRow);
  }

  /** Marks a Walking booking's walk as ended; used in fallback paths if
   *  BookingsService.end() is short-circuited. Currently unused — kept for
   *  symmetry with M3's tracking gateway disconnect logic. */
  async markEnded(walkId: UUID, distanceM: number): Promise<void> {
    await this.db
      .update(walks)
      .set({ endedAt: sql`now()`, distanceM })
      .where(eq(walks.id, walkId));
  }
}
