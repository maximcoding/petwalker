import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';

import { ENV_TOKEN, type Env } from '../config/env.js';
import { createDb, type Database } from '../db/client.js';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ENV_TOKEN],
      useFactory: (env: Env): Database =>
        createDb({
          url: env.DATABASE_URL,
          logger: env.NODE_ENV === 'development',
        }),
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async onModuleDestroy(): Promise<void> {
    // postgres-js client lives on db.$client; close it so Nest can shut down cleanly
    const client = (this.db as unknown as { $client?: { end?: () => Promise<void> } }).$client;
    await client?.end?.();
  }
}
