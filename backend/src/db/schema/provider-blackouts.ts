import { pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';

import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * Date ranges during which a provider is unavailable (vacations, blocked periods).
 * Booking creation skips any recurring-series dates that fall within a blackout window.
 */
export const providerBlackouts = pgTable('provider_blackouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id')
    .notNull()
    .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProviderBlackoutRow = typeof providerBlackouts.$inferSelect;
export type NewProviderBlackoutRow = typeof providerBlackouts.$inferInsert;
