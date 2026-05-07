import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { users, type UserRow } from '../../db/schema/index.js';

import { mapUserRow } from './user.mapper.js';

import type { User } from '@petwalker/shared/types';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * On first authenticated request, create the user row keyed by Cognito sub.
   * Subsequent calls simply return the row.
   */
  async upsertUser(cognitoSub: string, email: string): Promise<User> {
    const existing = await this.db.select().from(users).where(eq(users.cognitoSub, cognitoSub));
    if (existing[0]) return mapUserRow(existing[0]);

    const [created] = await this.db
      .insert(users)
      .values({ cognitoSub, email })
      .onConflictDoUpdate({
        target: users.cognitoSub,
        set: { email, updatedAt: sql`now()` },
      })
      .returning();
    if (!created) throw new Error('upsert returned no row');
    return mapUserRow(created as UserRow);
  }
}
