import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * One iCal feed per provider — the URL they paste into their profile so we
 * can mark times they're busy on an external calendar (Google, Outlook,
 * Apple, etc.) and exclude those slots when owners pick a booking time.
 *
 * One row per user (PK = userId). `enabled=false` pauses the sync without
 * losing the URL.
 */
export const providerCalendarFeeds = pgTable('provider_calendar_feeds', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
  icalUrl: text('ical_url').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastSyncError: text('last_sync_error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type ProviderCalendarFeedRow = typeof providerCalendarFeeds.$inferSelect;
export type NewProviderCalendarFeedRow = typeof providerCalendarFeeds.$inferInsert;

/**
 * Synced busy windows from a provider's external calendar. Replaced on every
 * sync — we delete-then-insert per-provider rather than diffing, since the
 * VEVENT graph for a 60-day horizon is small (typically <500 rows/provider).
 *
 * `externalId` is the VEVENT UID (often unique within feed). The
 * (provider_id, source, external_id) unique constraint lets the sync upsert
 * idempotently when we later switch from delete-and-insert to incremental.
 *
 * (provider_id, start_ts, end_ts) is the hot read path: the availability
 * check ORs an "any external block intersects?" subquery against this index.
 */
export const externalBusyBlocks = pgTable(
  'external_busy_blocks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    source: text('source').notNull().default('ical'),
    externalId: text('external_id').notNull(),
    startTs: timestamp('start_ts', { withTimezone: true }).notNull(),
    endTs: timestamp('end_ts', { withTimezone: true }).notNull(),
    summary: text('summary'),
    syncedAt: timestamp('synced_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqExternal: uniqueIndex('external_busy_blocks_unique')
      .on(t.providerId, t.source, t.externalId),
    overlapIdx: index('external_busy_blocks_overlap_idx')
      .on(t.providerId, t.startTs, t.endTs),
  }),
);

export type ExternalBusyBlockRow = typeof externalBusyBlocks.$inferSelect;
export type NewExternalBusyBlockRow = typeof externalBusyBlocks.$inferInsert;
