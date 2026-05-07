import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { serviceTypeEnum } from './enums.js';
import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * Discrete bookable slots for a slot-mode offering.
 *
 * Each row is one appointment-style window the provider has published.
 * Generated from the weekly availability template by the SlotGenerator
 * service for the next ~90 days; provider can also add/remove individual
 * rows manually via the profile UI.
 *
 * `status`:
 *   - 'open':      bookable
 *   - 'booked':    owner has reserved this slot — `bookingId` is set
 *   - 'cancelled': admin-cancelled or provider-removed; kept for audit
 *
 * The unique index on (provider_id, service_type, start_ts) prevents
 * duplicate slot publication when the generator runs twice.
 */
export const providerSlots = pgTable(
  'provider_slots',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    serviceType: serviceTypeEnum('service_type').notNull(),
    startTs: timestamp('start_ts', { withTimezone: true }).notNull(),
    endTs: timestamp('end_ts', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('open'),
    bookingId: uuid('booking_id').references(() => bookings.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqOffering: uniqueIndex('provider_slots_unique')
      .on(t.providerId, t.serviceType, t.startTs),
    queryIdx: index('provider_slots_query_idx')
      .on(t.providerId, t.serviceType, t.startTs, t.status),
  }),
);

export type ProviderSlotRow = typeof providerSlots.$inferSelect;
export type NewProviderSlotRow = typeof providerSlots.$inferInsert;
