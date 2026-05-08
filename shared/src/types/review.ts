import type { ISODateString, UUID } from './common.js';

/**
 * Owner-authored review of a completed booking.
 * `rating` is 1-5 stars, `body` is optional free text.
 */
export interface Review {
  bookingId: UUID;
  ownerId: UUID;
  providerId: UUID;
  rating: number;
  body?: string | null;
  createdAt: ISODateString;
}

/** Review with the bare slice of author info needed to render in a list. */
export interface ReviewWithAuthor extends Review {
  authorName: string;
  authorAvatarUrl?: string | null;
}
