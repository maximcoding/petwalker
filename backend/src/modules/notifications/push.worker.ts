import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Expo } from 'expo-server-sdk';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { pushTokens } from '../../db/schema/index.js';

import { PUSH_DISPATCHER, type PushDispatcher } from './push-dispatcher.js';
import { PUSH_QUEUE } from './notifications.service.js';
import type { PushNotificationPayload } from './notification-builders.js';

@Processor(PUSH_QUEUE)
export class PushWorker extends WorkerHost {
  private readonly logger = new Logger(PushWorker.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(PUSH_DISPATCHER) private readonly dispatcher: PushDispatcher,
  ) {
    super();
  }

  async process(job: Job<PushNotificationPayload>): Promise<void> {
    const { recipientUserId, title, body, deepLink, data } = job.data;

    const rows = await this.db
      .select({ expoToken: pushTokens.expoToken })
      .from(pushTokens)
      .where(
        and(eq(pushTokens.userId, recipientUserId), isNull(pushTokens.revokedAt)),
      );

    const valid = rows.filter((r) => Expo.isExpoPushToken(r.expoToken));
    if (valid.length === 0) {
      this.logger.debug(`No active tokens for user ${recipientUserId}`);
      return;
    }

    await this.dispatcher.send(
      valid.map((r) => ({
        to: r.expoToken,
        title,
        body,
        data: { deepLink: deepLink ?? '', ...data },
        sound: 'default' as const,
      })),
    );
  }
}
