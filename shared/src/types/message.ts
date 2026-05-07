import type { ISODateString, UUID } from './common.js';

export interface Message {
  id: UUID;
  bookingId: UUID;
  senderId: UUID;
  body: string;
  sentAt: ISODateString;
}
