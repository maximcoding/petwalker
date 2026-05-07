import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';

export const reviews = pgTable(
  'reviews',
  {
    bookingId: uuid('booking_id')
      .primaryKey()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ratingRange: check('rating_1_5', sql`${t.rating} BETWEEN 1 AND 5`),
  }),
);

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
