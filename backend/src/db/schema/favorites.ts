import { sql } from 'drizzle-orm';
import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { serviceProviderProfiles } from './service-provider-profiles.js';
import { users } from './users.js';

/**
 * Owner-side favorites — many-to-many through table mapping users to
 * providers they've saved.
 *
 * Composite PK on (user_id, provider_id) makes the toggle endpoints
 * idempotent without a separate unique constraint, and gives us the
 * obvious lookup index for "is X favorited by Y".
 *
 * `created_at` is what /me/favorites orders by, so a secondary
 * (user_id, created_at DESC) index covers the listing query.
 */
export const userFavorites = pgTable(
  'user_favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => serviceProviderProfiles.userId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.providerId] }),
    userRecentIdx: index('user_favorites_user_recent_idx').on(t.userId, t.createdAt),
  }),
);

export type UserFavoriteRow = typeof userFavorites.$inferSelect;
export type NewUserFavoriteRow = typeof userFavorites.$inferInsert;
