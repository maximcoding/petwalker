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
    /**
     * Free-form bio surfaced on the profile and (for providers) the
     * provider listing card. Capped to 600 chars at the API layer.
     */
    aboutMe: text('about_me'),
    /**
     * ISO-4217 code (USD/EUR/ILS so far). The CHECK constraint added in
     * 0013_user_about_currency.sql keeps the column in sync with
     * SUPPORTED_CURRENCIES from @petwalker/shared/types/user.
     */
    preferredCurrency: text('preferred_currency'),
    // Home / billing / default-service address. Free-form text — the
    // optional lat/lng pair lets us deep-link to maps if the owner pastes
    // them; we don't geocode automatically.
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
