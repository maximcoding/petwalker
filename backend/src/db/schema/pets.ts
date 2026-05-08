import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const pets = pgTable(
  'pets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    species: text('species').notNull().default('dog'),
    breed: text('breed'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
    ageYears: numeric('age_years', { precision: 4, scale: 1 }),
    notes: text('notes'),
    photoUrl: text('photo_url'),
    addressText: text('address_text'),
    addressLat: numeric('address_lat', { precision: 9, scale: 6 }),
    addressLng: numeric('address_lng', { precision: 9, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('pets_owner_idx').on(t.ownerId),
  }),
);

export type PetRow = typeof pets.$inferSelect;
export type NewPetRow = typeof pets.$inferInsert;
