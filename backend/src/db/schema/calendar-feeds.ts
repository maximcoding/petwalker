import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { serviceProviderProfiles } from './service-provider-profiles.js';

/**
 * Synced busy windows from a provider's external calendar (Google
 * Calendar today; iCal in the v1 implementation that's been retired).
 * Replaced wholesale on every sync — we delete-then-insert per provider
 * rather than diffing, since the busy-window graph for a 60-day horizon
 * is small.
 *
 * `externalId` is a deterministic hash of `start|end` for the Google
 * source (freebusy returns anonymous busy windows with no event UID),
 * and the original VEVENT UID for legacy iCal-sourced rows. The
 * (provider_id, source, external_id) unique constraint preserves
 * idempotency if we ever switch from delete-and-insert to incremental
 * sync.
 *
 * (provider_id, start_ts, end_ts) is the hot read path: the
 * availability check ORs an "any external block intersects?" subquery
 * against this index.
 *
 * Note: the legacy `provider_calendar_feeds` table still exists in dev
 * databases pending a migration to drop it. Its schema definition was
 * removed from this file once nothing imported it; the DB-side drop
 * lands in a follow-up migration so existing dev DBs stay valid until
 * then.
 */
export const externalBusyBlocks = pgTable(
  'external_busy_blocks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    /** 'google' (current) or 'ical' (legacy rows). */
    source: text('source').notNull().default('google'),
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
