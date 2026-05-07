import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { pushPlatformEnum } from './enums.js';
import { users } from './users.js';

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoToken: text('expo_token').notNull().unique(),
    platform: pushPlatformEnum('platform').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    userActiveIdx: index('push_tokens_user_idx')
      .on(t.userId)
      .where(sql`${t.revokedAt} IS NULL`),
  }),
);

export type PushTokenRow = typeof pushTokens.$inferSelect;
export type NewPushTokenRow = typeof pushTokens.$inferInsert;
