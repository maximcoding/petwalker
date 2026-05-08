import { integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { serviceTypeEnum } from './enums.js';
import { pets } from './pets.js';
import { users } from './users.js';

export const recurringSeries = pgTable('recurring_series', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  providerId: uuid('provider_id').notNull().references(() => users.id),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  serviceType: serviceTypeEnum('service_type').notNull(),
  recurrence: text('recurrence').notNull(),
  daysOfWeek: text('days_of_week').notNull(),
  timesOfDay: text('time_of_day').notNull(),    // renamed from timeOfDay
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  durationMin: integer('duration_min').notNull(),
  priceCents: integer('price_cents').notNull(),
  notes: text('notes'),
  addressText: text('address_text').notNull(),
  addressLat: numeric('address_lat', { precision: 9, scale: 6 }),
  addressLng: numeric('address_lng', { precision: 9, scale: 6 }),
  addressSource: text('address_source').notNull(),
  instanceCount: integer('instance_count').notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: text('cancelled_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RecurringSeriesRow = typeof recurringSeries.$inferSelect;
export type NewRecurringSeriesRow = typeof recurringSeries.$inferInsert;
