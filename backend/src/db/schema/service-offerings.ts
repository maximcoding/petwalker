import { boolean, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { serviceTypeEnum } from './enums.js';
import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * One row per (provider, service_type). A provider can offer many services
 * (walking + grooming) at different prices.
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
  },
  (t) => ({
    pk: primaryKey({ columns: [t.providerId, t.serviceType] }),
  }),
);

export type ServiceOfferingRow = typeof providerServiceOfferings.$inferSelect;
export type NewServiceOfferingRow = typeof providerServiceOfferings.$inferInsert;
