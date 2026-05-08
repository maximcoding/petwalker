import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { webNotifications, type WebNotificationRow } from '../../db/schema/index.js';

import type { PushNotificationPayload } from './notification-builders.js';

export const WEB_NOTIF_BROADCAST = Symbol('WEB_NOTIF_BROADCAST');

export type BroadcastFn = (room: string, payload: unknown) => void;

export interface WebNotification {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

function mapRow(r: WebNotificationRow): WebNotification {
  return {
    id: r.id,
    userId: r.userId,
    eventType: r.eventType,
    title: r.title,
    body: r.body,
    deepLink: r.deepLink ?? null,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class WebNotificationsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(WEB_NOTIF_BROADCAST) private readonly broadcast: BroadcastFn,
  ) {}

  async dispatch(payload: PushNotificationPayload): Promise<void> {
    const [row] = await this.db
      .insert(webNotifications)
      .values({
        userId: payload.recipientUserId,
        eventType: payload.eventType,
        title: payload.title,
        body: payload.body,
        deepLink: payload.deepLink ?? null,
      })
      .returning();
    if (!row) return;
    this.broadcast(`user:${payload.recipientUserId}:notifications`, {
      type: 'notification:received',
      notification: mapRow(row),
    });
  }

  async list(userId: string, limit = 30): Promise<WebNotification[]> {
    const rows = await this.db
      .select()
      .from(webNotifications)
      .where(eq(webNotifications.userId, userId))
      .orderBy(desc(webNotifications.createdAt))
      .limit(limit);
    return (rows as WebNotificationRow[]).map(mapRow);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.db
      .update(webNotifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(webNotifications.id, notificationId),
          eq(webNotifications.userId, userId),
          isNull(webNotifications.readAt),
        ),
      );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(webNotifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(webNotifications.userId, userId), isNull(webNotifications.readAt)));
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: webNotifications.id })
      .from(webNotifications)
      .where(and(eq(webNotifications.userId, userId), isNull(webNotifications.readAt)));
    return rows.length;
  }
}
