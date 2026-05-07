import { sql } from 'drizzle-orm';
import { bigserial, index, integer, jsonb, numeric, pgTable, timestamp, uuid }
  from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';

import type { GeoSample } from '@petwalker/shared/types';

export const walks = pgTable('walks', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookingId: uuid('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  /** array of {lat, lng, t} samples — see @petwalker/shared types/common */
  polyline: jsonb('polyline').$type<GeoSample[]>().default([]),
  distanceM: integer('distance_m'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gpsPings = pgTable(
  'gps_pings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    walkId: uuid('walk_id')
      .notNull()
      .references(() => walks.id, { onDelete: 'cascade' }),
    lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
    lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
    accuracyM: numeric('accuracy_m', { precision: 6, scale: 2 }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    walkTimeIdx: index('gps_pings_walk_time_idx').on(t.walkId, t.capturedAt),
  }),
);

export type WalkRow = typeof walks.$inferSelect;
export type NewWalkRow = typeof walks.$inferInsert;
export type GpsPingRow = typeof gpsPings.$inferSelect;
export type NewGpsPingRow = typeof gpsPings.$inferInsert;
