import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { serviceProviderProfiles } from './service-provider-profiles.js';
import { users } from './users.js';

/**
 * Reviews — one per completed booking, owner-authored, provider-targeted.
 *
 * `bookingId` is the PK so the "one review per booking" rule is enforced
 * at the DB level for free. `ownerId`/`providerId` are denormalised from
 * the booking row at insert time so the per-provider listing and the
 * aggregate AVG/COUNT in /providers search don't need to JOIN through
 * bookings every read.
 */
export const reviews = pgTable(
  'reviews',
  {
    bookingId: uuid('booking_id')
      .primaryKey()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    body: text('body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ratingRange: check('rating_1_5', sql`${t.rating} BETWEEN 1 AND 5`),
    providerRecentIdx: index('reviews_provider_recent_idx').on(t.providerId, t.createdAt),
  }),
);

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
