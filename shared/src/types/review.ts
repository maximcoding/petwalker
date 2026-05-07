import type { ISODateString, UUID } from './common.js';

export interface Review {
  bookingId: UUID;
  rating: number; // 1..5
  comment?: string | null;
  createdAt: ISODateString;
}
