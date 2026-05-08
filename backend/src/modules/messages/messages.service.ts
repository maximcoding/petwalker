import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt, or } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { bookings, messages, type MessageRow } from '../../db/schema/index.js';

import { buildNewMessagePayload } from '../notifications/notification-builders.js';
import { NotificationsService } from '../notifications/notifications.service.js';

import { mapMessageRow } from './message.mapper.js';

import type {
  CursorPage,
  ListMessagesQuery,
  Message,
  SendMessageDto,
  UUID,
} from '@petwalker/shared';

interface MessagesCursor {
  /** sentAt ISO of the last item in the previous page. */
  t: string;
  id: string;
}

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(
    viewerId: UUID,
    bookingId: UUID,
    q: ListMessagesQuery,
  ): Promise<CursorPage<Message>> {
    await this.assertMember(viewerId, bookingId);

    const conditions = [eq(messages.bookingId, bookingId)];
    const cursor = decodeCursor<MessagesCursor>(q.cursor);
    if (cursor) {
      const t = new Date(cursor.t);
      conditions.push(
        or(
          lt(messages.sentAt, t),
          and(eq(messages.sentAt, t), lt(messages.id, cursor.id)),
        )!,
      );
    }

    // Most recent first; client reverses on render. Over-fetch by one for the cursor.
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.sentAt), desc(messages.id))
      .limit(q.limit + 1);

    return buildCursorPage(
      rows as MessageRow[],
      q.limit,
      mapMessageRow,
      (r) => ({ t: r.sentAt.toISOString(), id: r.id } satisfies MessagesCursor),
    );
  }

  async send(viewerId: UUID, bookingId: UUID, dto: SendMessageDto): Promise<Message> {
    await this.assertMember(viewerId, bookingId);

    const [row] = await this.db
      .insert(messages)
      .values({
        bookingId,
        senderId: viewerId,
        body: dto.body,
      })
      .returning();
    if (!row) throw new Error('insert returned no row');

    const [booking] = await this.db
      .select({ ownerId: bookings.ownerId, providerId: bookings.providerId })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (booking) {
      const recipientUserId = booking.ownerId === viewerId ? booking.providerId : booking.ownerId;
      this.notifications.notifyAsync(
        buildNewMessagePayload({
          recipientUserId,
          bookingId,
          senderName: 'New message',
          preview: dto.body,
        }),
      );
    }

    return mapMessageRow(row as MessageRow);
  }

  /**
   * Confirm the viewer is the booking's owner or provider. Used both by REST
   * endpoints and the chat WS gateway during room subscription.
   */
  async assertMember(viewerId: UUID, bookingId: UUID): Promise<void> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.ownerId !== viewerId && booking.providerId !== viewerId) {
      throw new ForbiddenException('Not your booking');
    }
  }
}
