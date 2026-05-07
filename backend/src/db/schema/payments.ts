import { sql } from 'drizzle-orm';
import { boolean, char, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { paymentStatusEnum } from './enums.js';
import { users } from './users.js';

export const stripeAccounts = pgTable('stripe_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeAccountId: text('stripe_account_id').notNull().unique(),
  chargesEnabled: boolean('charges_enabled').notNull().default(false),
  payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
  detailsSubmitted: boolean('details_submitted').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  /** Set on `payment_intent.succeeded` — required for refunds. */
  stripeChargeId: text('stripe_charge_id'),
  amountCents: integer('amount_cents').notNull(),
  /** What the platform keeps. Provider gets amount - applicationFee. */
  applicationFeeCents: integer('application_fee_cents').notNull().default(0),
  /** Cumulative refunded amount — partial refunds add up here. */
  refundedCents: integer('refunded_cents').notNull().default(0),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  status: paymentStatusEnum('status').notNull().default('requires_action'),
  /** Populated on payment_intent.payment_failed. */
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StripeAccountRow = typeof stripeAccounts.$inferSelect;
export type NewStripeAccountRow = typeof stripeAccounts.$inferInsert;
export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
