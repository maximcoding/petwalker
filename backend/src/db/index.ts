// backend/src/db — internal Drizzle layer (used by NestJS modules + CLI scripts).
//
//   import { createDb, schema, type Database } from '../db';
//   import { users, bookings, type BookingRow } from '../db/schema';

export { createDb, schema, type Database, type DbConfig } from './client.js';
export * from './schema/index.js';
