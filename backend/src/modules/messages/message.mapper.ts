import type { MessageRow } from '../../db/schema/index.js';

import type { Message } from '@petwalker/shared';

function isoRequired(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    bookingId: row.bookingId,
    senderId: row.senderId,
    body: row.body,
    sentAt: isoRequired(row.sentAt),
  };
}
