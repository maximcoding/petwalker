import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { bookingStatusEnum, serviceTypeEnum, userRoleEnum } from './enums.js';
import { pets } from './pets.js';
import { users } from './users.js';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id),
    petId: uuid('pet_id')
      .notNull()
      .references(() => pets.id),
    serviceType: serviceTypeEnum('service_type').notNull().default('walking'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    /** Locked at booking time. */
    priceCents: integer('price_cents').notNull(),
    notes: text('notes'),

    // Resolved address snapshot — captured at booking time so renaming or
    // moving a pet/owner/provider/offering address later doesn't rewrite
    // history. NOT NULL because every booking happens *somewhere*.
    addressText: text('address_text').notNull().default(''),
    addressLat: numeric('address_lat', { precision: 9, scale: 6 }),
    addressLng: numeric('address_lng', { precision: 9, scale: 6 }),
    /**
     * Where the address came from when the booking was created:
     *   'owner_user'        — owner's user.address
     *   'owner_pet'         — pet's overriding address
     *   'provider_user'     — provider's user.address
     *   'provider_offering' — offering's serviceAddress override
     *   'custom'            — owner typed a one-off
     * Stored as text so adding sources later doesn't need an ALTER TYPE.
     */
    addressSource: text('address_source').notNull().default('owner_pet'),

    // Cancellation outcome — populated by the cancel endpoint, consumed by M4 (payments).
    cancelledBy: userRoleEnum('cancelled_by'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    refundCents: integer('refund_cents').notNull().default(0),
    appFeeCents: integer('app_fee_cents').notNull().default(0),
    providerFeeCents: integer('provider_fee_cents').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    recurringSeriesId: uuid('recurring_series_id'),
  },
  (t) => ({
    providerIdx: index('bookings_provider_idx').on(t.providerId, t.scheduledAt),
    ownerIdx: index('bookings_owner_idx').on(t.ownerId, t.scheduledAt),
    durationCheck: check('duration_min_positive', sql`${t.durationMin} > 0`),
  }),
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
