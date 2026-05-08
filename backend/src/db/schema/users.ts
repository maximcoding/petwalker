import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { userRoleEnum } from './enums.js';

// citext is shipped by the `citext` extension (loaded in infra/postgres/init/01-extensions.sql).
const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    cognitoSub: text('cognito_sub').notNull().unique(),
    email: citext('email').notNull().unique(),
    role: userRoleEnum('role').notNull().default('owner'),
    fullName: text('full_name'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    addressText: text('address_text'),
    addressLat: numeric('address_lat', { precision: 9, scale: 6 }),
    addressLng: numeric('address_lng', { precision: 9, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cognitoSubIdx: index('users_cognito_sub_idx').on(t.cognitoSub),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
