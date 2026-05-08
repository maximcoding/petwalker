import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt, or } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  bookings,
  reviews,
  users,
  type ReviewRow,
  type UserRow,
} from '../../db/schema/index.js';

import type { CreateReviewDto, ListReviewsQuery } from '@petwalker/shared/dto';
import type {
  CursorPage,
  Review,
  ReviewWithAuthor,
} from '@petwalker/shared/types';

interface ReviewsCursor {
  /** Boundary createdAt of the previous page, ISO string. */
  t: string;
  /** Tiebreaker — booking_id (which is the PK). */
  id: string;
}

/**
 * Reviews — owner-authored, one per completed booking. The owner_id and
 * provider_id columns on the row are denormalised from the booking at
 * insert time so the per-provider listing query and the aggregate
 * AVG/COUNT in `/providers` search don't need to JOIN through bookings.
 */
@Injectable()
export class ReviewsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async create(ownerId: string, bookingId: string, dto: CreateReviewDto): Promise<Review> {
    // Load the booking — we need owner/provider for the FK columns and
    // status for the gating check. One round-trip.
    const [b] = await this.db
      .select({
        id: bookings.id,
        ownerId: bookings.ownerId,
        providerId: bookings.providerId,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!b) throw new NotFoundException('Booking not found');
    if (b.ownerId !== ownerId) {
      throw new ForbiddenException('Only the booking owner can leave a review');
    }
    if (b.status !== 'completed') {
      throw new BadRequestException(
        'Reviews are only allowed once the booking is completed',
      );
    }

    // Pre-check for the cleaner 409 — the UNIQUE-on-PK is the safety net.
    const existing = await this.db
      .select({ bookingId: reviews.bookingId })
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId))
      .limit(1);
    if (existing.length) {
      throw new ConflictException('A review for this booking already exists');
    }

    try {
      const [row] = await this.db
        .insert(reviews)
        .values({
          bookingId,
          ownerId: b.ownerId,
          providerId: b.providerId,
          rating: dto.rating,
          body: dto.body ?? null,
        })
        .returning();
      if (!row) throw new Error('insert returned no row');
      return mapReviewRow(row as ReviewRow);
    } catch (err) {
      // PG 23505 — unique violation; convert to 409 in case the pre-check
      // raced with a concurrent submission.
      if (typeof err === 'object' && err && (err as { code?: string }).code === '23505') {
        throw new ConflictException('A review for this booking already exists');
      }
      throw err;
    }
  }

  /** Returns the review for a booking, or null. */
  async forBooking(bookingId: string): Promise<Review | null> {
    const rows = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId))
      .limit(1);
    const row = rows[0] as ReviewRow | undefined;
    return row ? mapReviewRow(row) : null;
  }

  /** Cursor-paginated reviews for a provider, most-recent first, with author info. */
  async listForProvider(
    providerId: string,
    q: ListReviewsQuery,
  ): Promise<CursorPage<ReviewWithAuthor>> {
    const conditions = [eq(reviews.providerId, providerId)];

    const cursor = decodeCursor<ReviewsCursor>(q.cursor);
    if (cursor) {
      const t = new Date(cursor.t);
      conditions.push(
        or(
          lt(reviews.createdAt, t),
          and(eq(reviews.createdAt, t), lt(reviews.bookingId, cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select({
        review: reviews,
        author: { fullName: users.fullName, avatarUrl: users.avatarUrl },
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.ownerId))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt), desc(reviews.bookingId))
      .limit(q.limit + 1);

    return buildCursorPage(
      rows,
      q.limit,
      (r) =>
        ({
          ...mapReviewRow(r.review as ReviewRow),
          authorName: r.author.fullName ?? '',
          authorAvatarUrl: r.author.avatarUrl ?? null,
        }) satisfies ReviewWithAuthor,
      (r) => ({
        t: r.review.createdAt.toISOString(),
        id: r.review.bookingId,
      } satisfies ReviewsCursor),
    );
  }
}

function mapReviewRow(row: ReviewRow): Review {
  return {
    bookingId: row.bookingId,
    ownerId: row.ownerId,
    providerId: row.providerId,
    rating: row.rating,
    body: row.body ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
