import { pgTable, primaryKey, smallint, time, uuid } from 'drizzle-orm/pg-core';

import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * Recurring weekly availability slots, in UTC.
 *
 * dayOfWeek: 0=Sunday..6=Saturday (matches Postgres EXTRACT(DOW), JS getUTCDay()).
 * start_time / end_time: time of day (HH:MM:SS) in UTC.
 *
 * Multiple slots per (provider, dayOfWeek) are allowed (e.g. 9–12 and 14–18).
 */
export const providerAvailability = pgTable(
  'provider_availability',
  {
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    dayOfWeek: smallint('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.providerId, t.dayOfWeek, t.startTime] }),
  }),
);

export type ProviderAvailabilityRow = typeof providerAvailability.$inferSelect;
export type NewProviderAvailabilityRow = typeof providerAvailability.$inferInsert;
