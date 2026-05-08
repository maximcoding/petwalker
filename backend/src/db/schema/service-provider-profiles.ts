import { numeric, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  // Display-only: city shown as a chip on the provider card. Search still
  // uses lat/lng + radius — this is purely a human-readable label so we
  // don't need geocoding in the dev flow.
  baseCity: text('base_city'),
  // Year the provider started doing this professionally. Surfaced on cards
  // as "Walking since {year}". DB CHECK enforces a sane range.
  experienceSinceYear: smallint('experience_since_year'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
});

export type ServiceProviderProfileRow = typeof serviceProviderProfiles.$inferSelect;
export type NewServiceProviderProfileRow = typeof serviceProviderProfiles.$inferInsert;
