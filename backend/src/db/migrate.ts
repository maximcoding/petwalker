// CLI: `pnpm --filter @petwalker/backend db:migrate`
// 1. ensures pgcrypto + citext extensions exist (idempotent)
// 2. runs drizzle-orm migrator against ./drizzle/migrations

import '../config/load-env.js';
import { existsSync } from 'node:fs';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const migrationsFolder = './drizzle/migrations';
if (!existsSync(migrationsFolder)) {
  console.error(`No migrations at ${migrationsFolder}. Run: pnpm db:generate first`);
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`CREATE EXTENSION IF NOT EXISTS citext`;

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder });
  console.log('migrations applied');
} catch (err) {
  console.error('migrate failed:', err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
