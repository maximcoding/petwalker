import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * General provider profile — bio, base location, service radius, verified flag.
 * Per-service prices live in `provider_service_offerings`.
 */
export const serviceProviderProfiles = pgTable('service_provider_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  serviceRadiusKm: numeric('service_radius_km', { precision: 6, scale: 2 }).notNull().default('5'),
  baseLat: numeric('base_lat', { precision: 9, scale: 6 }),
  baseLng: numeric('base_lng', { precision: 9, scale: 6 }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
});

export type ServiceProviderProfileRow = typeof serviceProviderProfiles.$inferSelect;
export type NewServiceProviderProfileRow = typeof serviceProviderProfiles.$inferInsert;
