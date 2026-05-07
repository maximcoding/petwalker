import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  @Get()
  async health(): Promise<{ status: 'ok'; checks: Record<string, 'ok' | 'fail'> }> {
    const checks: Record<string, 'ok' | 'fail'> = {};
    try {
      await this.db.execute(sql`SELECT 1`);
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'fail';
    }
    return { status: 'ok', checks };
  }
}
