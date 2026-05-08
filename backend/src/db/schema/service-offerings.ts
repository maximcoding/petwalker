import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

import { serviceTypeEnum } from './enums.js';
import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * One row per (provider, service_type). A provider can offer many services
 * (walking + grooming) at different prices.
 *
 * `bookingMode` controls the booking flow for this offering:
 *   - 'window': owner picks any time inside the provider's weekly availability
 *   - 'slot':   owner picks from a list of pre-published discrete slots
 *               materialized into `provider_slots`
 *
 * Stored as text so the @petwalker/shared `BookingMode` enum is the source
 * of truth — adding new modes (range, recurring) won't need a Postgres
 * `ALTER TYPE` migration.
 */
export const providerServiceOfferings = pgTable(
  'provider_service_offerings',
  {
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    serviceType: serviceTypeEnum('service_type').notNull(),
    hourlyRateCents: integer('hourly_rate_cents').notNull(),
    active: boolean('active').notNull().default(true),
    bookingMode: text('booking_mode').notNull().default('window'),
    slotDurationMin: integer('slot_duration_min').notNull().default(60),
    serviceAddressText: text('service_address_text'),
    serviceAddressLat: numeric('service_address_lat', { precision: 9, scale: 6 }),
    serviceAddressLng: numeric('service_address_lng', { precision: 9, scale: 6 }),
    addressDefault: text('address_default').notNull().default('owner'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.providerId, t.serviceType] }),
  }),
);

export type ServiceOfferingRow = typeof providerServiceOfferings.$inferSelect;
export type NewServiceOfferingRow = typeof providerServiceOfferings.$inferInsert;
