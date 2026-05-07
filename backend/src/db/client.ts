import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type DbConfig = {
  /** Postgres connection string. Defaults to process.env.DATABASE_URL. */
  url?: string;
  /** Connection pool size. Default 10. */
  max?: number;
  /** Drizzle logger. Default false. */
  logger?: boolean;
};

export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle/postgres-js client.
 * NestJS will register a single instance via DI in Phase 5.
 */
export function createDb(cfg: DbConfig = {}) {
  const url = cfg.url ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to create a DB client');

  const client = postgres(url, {
    max: cfg.max ?? 10,
    prepare: false, // recommended for pgbouncer-style poolers / RDS Proxy
  });
  return drizzle(client, { schema, logger: cfg.logger ?? false });
}

export { schema };
