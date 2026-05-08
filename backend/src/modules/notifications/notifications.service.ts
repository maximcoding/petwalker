import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { sql, eq, and } from 'drizzle-orm';
import type { Queue } from 'bullmq';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { pushTokens } from '../../db/schema/index.js';

import type { PushNotificationPayload } from './notification-builders.js';
import { WebNotificationsService } from './web-notifications.service.js';
import type { RegisterPushTokenDto } from '@petwalker/shared';

export const PUSH_QUEUE = 'push-notifications';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @InjectQueue(PUSH_QUEUE) private readonly queue: Queue<PushNotificationPayload>,
    @Inject(WebNotificationsService) private readonly webNotifs: WebNotificationsService,
  ) {}

  async registerToken(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    await this.db
      .insert(pushTokens)
      .values({ userId, expoToken: dto.expoToken, platform: dto.platform })
      .onConflictDoUpdate({
        target: pushTokens.expoToken,
        set: { userId, revokedAt: null },
      });
  }

  async revokeToken(expoToken: string, userId: string): Promise<void> {
    await this.db
      .update(pushTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(pushTokens.expoToken, expoToken), eq(pushTokens.userId, userId)));
  }

  notifyAsync(payload: PushNotificationPayload): void {
    this.webNotifs.dispatch(payload).catch((err: unknown) => {
      this.logger.error('Failed to dispatch web notification', err);
    });

    this.queue
      .add('push', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to enqueue push notification', err);
      });
  }
}
