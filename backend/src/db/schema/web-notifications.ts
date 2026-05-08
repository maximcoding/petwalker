import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const webNotifications = pgTable(
  'web_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    deepLink: text('deep_link'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUnreadIdx: index('web_notifications_user_unread_idx').on(t.userId, t.createdAt),
  }),
);

export type WebNotificationRow = typeof webNotifications.$inferSelect;
export type NewWebNotificationRow = typeof webNotifications.$inferInsert;
